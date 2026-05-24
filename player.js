// ================================
// Global Player State (Clappr is the DEFAULT)
// ================================
window.useClapprPlayer = true;
window.visibilityHandler = null;

// ================================
// TV Detection Function
// ================================
function isTV() {
    const ua = navigator.userAgent.toLowerCase();
    if (/tv|smart-tv|tizen|webos|android.*tv|firetv|rokutv|appletv|vidda|hisense|panasonic|vizio|playstation|xbox/i.test(ua)) {
        return true;
    }
    return !('ontouchstart' in window) && 
           window.screen.width >= 1920 && 
           window.screen.height - window.innerHeight < 100 &&
           !/ipad|tablet|android(?!.*tv)|macintosh|windows/i.test(ua);
}

// ================================
// DRM Key Conversion Utilities
// ================================
function hexToUint8Array(hex) {
    if (!hex || hex.length % 2 !== 0) return new Uint8Array(0);
    if (typeof hex !== 'string' || !/^[0-9a-fA-F]+$/.test(hex)) {
        console.error('Invalid hex input for DRM keys:', hex);
        return new Uint8Array(0);
    }
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
        bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
    }
    return bytes;
}

// ================================
// NEW SMART DETECTOR FOR SPECIAL CLEARKEY LINKS
// ================================
function extractZapprClearkeyData(rawUrl) {
    try {
        if (!rawUrl || !rawUrl.includes('/clearkey/')) return null;
        let cleanUrl = rawUrl.replace(/&amp;/g, '&');
        let urlObj = new URL(cleanUrl);
        let encodedStream = urlObj.searchParams.get("url");
        if (!encodedStream) return null;

        let videoUrl = decodeURIComponent(encodedStream);
        let clearKeysObj = null;

        // 1. Check for the multi-keys format (&keys=...)
        let encodedKeys = urlObj.searchParams.get("keys");
        if (encodedKeys) {
            let decodedKeys = decodeURIComponent(encodedKeys);
            if (decodedKeys.includes('%')) {
                decodedKeys = decodeURIComponent(decodedKeys);
            }
            clearKeysObj = JSON.parse(decodedKeys);
        } 
        // 2. Check for the new single key format (&kid=...&key=...)
        else {
            let kid = urlObj.searchParams.get("kid");
            let key = urlObj.searchParams.get("key");
            if (kid && key) {
                clearKeysObj = {};
                // Normalize keys by removing any dashes if present, matching standard hex format
                let cleanKid = kid.replace(/-/g, '').toLowerCase();
                let cleanKey = key.replace(/-/g, '').toLowerCase();
                clearKeysObj[cleanKid] = cleanKey;
            }
        }

        if (!clearKeysObj) return null;

        return {
            video: videoUrl,
            keys: clearKeysObj
        };
    } catch (e) {
        console.error('Error parsing clearkey url formats:', e);
        return null;
    }
}

function forceReleaseDRM() {
    try {
        var altVid = document.getElementById('alternate-video-player');
        if (window.shakaPlayer && typeof window.shakaPlayer.detach === 'function') {
            window.shakaPlayer.detach(); 
        }
        if (altVid) {
            altVid.pause();
            altVid.src = "";
            altVid.load();
            if (typeof altVid.setMediaKeys === 'function') {
                altVid.setMediaKeys(null).catch(function(){});
            }
        }
    } catch (e) {
        console.log("Safety cleanup skipped");
    }
}

// ================================
// Helper function for dependency check
// ================================
function checkDependency(name, globalObject) {
    if (typeof globalObject === 'undefined') {
        console.error('ERROR: The required library "' + name + '" is not loaded or defined in the global scope. Cannot initialize player functionality.');
        return false;
    }
    return true;
}

// ================================
// Cached Plugins for Clappr
// ================================
var cachedClapprPlugins = null;
function getClapprPlugins() {
    if (!cachedClapprPlugins) {
        cachedClapprPlugins = [window.LevelSelector, window.ClapprPip && window.ClapprPip.PipButton, window.ClapprPip && window.ClapprPip.PipPlugin, window.DashShakaPlayback].filter(Boolean);
    }
    return cachedClapprPlugins;
}

// ================================
// Spinner Utility Functions
// ================================
function showSpinner(container) {
    var existingSpinner = document.getElementById('loading-spinner');
    if (existingSpinner) existingSpinner.remove();
    
    var spinner = document.createElement('div');
    spinner.id = 'loading-spinner';
    spinner.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:50px;height:50px;border:5px solid #f3f3f3;border-top:5px solid #3498db;border-radius:50%;animation:spin 1s linear infinite;z-index:10;';
    container.appendChild(spinner);
    
    setTimeout(() => {
        if (document.getElementById('loading-spinner')) {
            hideSpinner();
        }
    }, 15000);
}

function hideSpinner() {
    var spinner = document.getElementById('loading-spinner');
    if (spinner) spinner.remove();
}

// ================================
// Player Cleanup Function
// ================================
function cleanupPlayerInstances() {
    fallbackAttempts = {};
    var playerContainer = document.getElementById('player');
    var alternateVideo = document.getElementById('alternate-video-player');
    if (window.clapprPlayer) {
        try {
            window.clapprPlayer.destroy();
        } catch(e) {
            console.warn('Clappr cleanup failed:', e);
        }
        window.clapprPlayer = null;
    }

    if (window.shakaPlayer) {
        try {
            window.shakaPlayer.destroy();
        } catch(e) {
            console.warn('Shaka cleanup failed:', e);
        }
        window.shakaPlayer = null;
    }
    if (window.hlsPlayer) {
        try {
            window.hlsPlayer.destroy();
        } catch(e) {
            console.warn('HLS cleanup failed:', e);
        }
        window.hlsPlayer = null;
    }
    if (alternateVideo) {
        alternateVideo.pause();
        alternateVideo.remove();
    }
    
    if (window.syncInterval) {
        clearInterval(window.syncInterval);
        window.syncInterval = null;
    }

    if (window.visibilityHandler) {
        document.removeEventListener('visibilitychange', window.visibilityHandler);
        window.visibilityHandler = null;
    }
    
    var closeBtn = document.getElementById('clappr-close-btn');
    if (closeBtn) {
        closeBtn.remove();
    }
    
    var audio = document.getElementById('audio-player');
    if (audio) {
        audio.pause();
        audio.removeAttribute('src');
        audio.muted = true;
        audio.volume = 0;
        audio.style.display = 'none';
    }

    var popup = document.getElementById('fullscreen-popup');
    if(popup) popup.remove();
    
    hideSpinner();
}

// ================================
// Debounce utility for switchPlayer
// ================================
function debounce(func, wait) {
    var timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// ================================
// Volume Persistence Helpers
// ================================
function getSavedVolume() {
    try {
        var saved = localStorage.getItem('playerVolume');
        var muted = localStorage.getItem('playerMuted');
        return {
            volume: saved !== null ? parseFloat(saved) : 1.0,
            muted: muted === 'true'
        };
    } catch(e) {
        return { volume: 1.0, muted: false };
    }
}

function saveVolume(volume, muted) {
    try {
        localStorage.setItem('playerVolume', volume);
        localStorage.setItem('playerMuted', muted ? 'true' : 'false');
    } catch(e) {}
}

// ================================
// Preloader + Default Clappr Init
// ================================
var preloader = document.getElementById('preloader');
var counter = document.getElementById('count');
var count = 1;
var timer;
if (preloader && counter) {
  var max = 100;
  var duration = 4000;
  var step = duration / max;
  counter.textContent = count;
  timer = setInterval(function() {
    count++;
    if (count >= max) {
      count = max;
      clearInterval(timer);
    }
    counter.textContent = count;
  }, step);
}

window.addEventListener('load', function() {
  if (window.shaka) {
        window.shaka.polyfill.installAll();
    }
  if (preloader) {
    preloader.style.transition = 'opacity 0.5s ease-out';
    preloader.style.opacity = '0';
    preloader.addEventListener('transitionend', function() {
      preloader.style.display = 'none';
      if (timer) clearInterval(timer);
    }, {once: true});
  }
  
    if (!checkDependency('Clappr', window.Clappr)) {
        tryDefaultHlsFallback();
        return;
    }

    var videoSrc = "https://d27wu3gni4gipu.cloudfront.net/v1/master/3722c60a815c199d9c0ef36c5b73da68a62b09d1/cc-7i6bsjw4lfg88/ABCD/Rai/RaiNews24_IT/rainews1/playlist.m3u8";
    var playerContainer = document.getElementById('player');
    try {
        window.clapprPlayer = new Clappr.Player({
            source: videoSrc,
            parentId: "#player",
            autoPlay: false,
            mute: true,
            height: "100%",
            width: "100%",
            plugins: getClapprPlugins(),
            playback: videoSrc.indexOf('.mpd') > -1 ?
                window.Clappr.DashShakaPlayback : 
                {
                    hlsjsConfig: {
                        maxBufferLength: 10,
                        liveSyncDurationCount: 3,
                        enableWorker: false,
                        abrEwmaFastLiveLatency: 2, 
                        abrEwmaSlowLiveLatency: 4
                    }
                }
        });
    } catch(e) {
        console.error('Default Clappr init failed:', e);
        tryDefaultHlsFallback();
    }
});

function tryDefaultHlsFallback() {
    var defaultLink = document.querySelector('#link-list a[href="https://d27wu3gni4gipu.cloudfront.net/v1/master/3722c60a815c199d9c0ef36c5b73da68a62b09d1/cc-7i6bsjw4lfg88/ABCD/Rai/RaiNews24_IT/rainews1/playlist.m3u8"]');
    if (defaultLink && checkDependency('Hls', window.Hls) && window.Hls.isSupported()) {
        var playerContainer = document.getElementById('player');
        showSpinner(playerContainer);
        var video = document.createElement('video');
        video.id = 'alternate-video-player';
        video.autoplay = false;
        video.muted = true;
        video.controls = true;
        video.style.cssText = 'width:100%;height:100%;';
        playerContainer.appendChild(video);
        var hls = new window.Hls();
        hls.loadSource(defaultLink.href);
        video.muted = true;
        hls.attachMedia(video);
        hls.on(window.Hls.Events.FRAG_BUFFERED, function() { 
            video.play().catch(() => {}); 
            hideSpinner();
        });
        hls.on(window.Hls.Events.ERROR, function() {
            hideSpinner();
            if (window.userSelectedHls) {
                console.warn('HLS error detected but user forced HLS — staying on HLS.');
                return;
            } else {
                console.warn('Default HLS failed — trying native playback.');
                if (video.canPlayType('application/vnd.apple.mpegurl')) {
                    video.src = defaultLink.href;
                    video.muted = true;
                    video.addEventListener('canplaythrough', function() {
                        video.play().catch(() => {});
                        hideSpinner();
                    }, {once: true});
                    video.addEventListener('error', hideSpinner, {once: true});
                } else {
                    console.error('HLS not natively supported and Hls.js not working or missing.');
                    hideSpinner();
                    tryFallback(defaultLink.href, null, null, null, 'hls');
                }
            }
        });
    } else if (defaultLink) {
        var playerContainer = document.getElementById('player');
        showSpinner(playerContainer);
        var video = document.createElement('video');
        if (video.canPlayType('application/vnd.apple.mpegurl')) {
            video.id = 'alternate-video-player';
            video.autoplay = false;
            video.muted = true;
            video.controls = true;
            video.style.cssText = 'width:100%;height:100%;';
            playerContainer.appendChild(video);

            video.src = defaultLink.href;
            video.addEventListener('canplaythrough', function() {
                video.play().catch(() => {});
                hideSpinner();
            }, {once: true});
            video.addEventListener('error', hideSpinner, {once: true});
        } else {
            hideSpinner();
        }
    } else {
        hideSpinner();
    }
}

// ================================
// Fullscreen Confirmation Popup (with Ad)
// ================================
function showFullscreenPopup(container){
    var existing = document.getElementById('fullscreen-popup');
    if(existing) existing.remove();
    var overlay = document.createElement('div');
    overlay.id = 'fullscreen-popup';
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.5);display:flex;justify-content:center;align-items:center;z-index:9999999;';

    var box = document.createElement('div');
    box.style.cssText = 'background:white;color:#000;padding:20px 30px;border-radius:10px;text-align:center;box-shadow:0 0 20px rgba(0,0,0,0.3);max-width:90%;';

    var text = document.createElement('div');
    text.textContent = 'Schermo intero?';
    text.style.cssText = 'margin-bottom:15px;font-size:18px;';
    var yesBtn = document.createElement('button');
    yesBtn.textContent = 'Si';
    yesBtn.style.cssText = 'padding:8px 16px;margin-right:10px;border:none;border-radius:5px;background:#28a745;color:white;cursor:pointer;font-size:16px';

    var noBtn = document.createElement('button');
    noBtn.textContent = 'No';
    noBtn.style.cssText = 'padding:8px 16px;border:none;border-radius:5px;background:#dc3545;color:white;cursor:pointer;font-size:16px';

    box.appendChild(text);
    box.appendChild(yesBtn);
    box.appendChild(noBtn);

    var spacer = document.createElement('div');
    spacer.style.cssText = 'height:25px;';
    box.appendChild(spacer);

    var promoBanner = document.createElement('a');
    promoBanner.href = 'https://www.kritere.com/p/iptv.html';
    promoBanner.target = '_blank';
    promoBanner.rel = 'noopener noreferrer';
    promoBanner.style.cssText = 'display:block;width:300px;height:250px;margin:10px auto 0;border-radius:10px;background:#ffffff;border:1.5px solid #e0e0e0;text-decoration:none;box-shadow:0 2px 12px rgba(0,0,0,0.10);overflow:hidden;';
    promoBanner.innerHTML = ''
        + '<div style="width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;box-sizing:border-box;">'
        + '<div style="font-size:13px;font-weight:600;color:#888;letter-spacing:0.12em;text-transform:uppercase;margin-bottom:10px;">Offerta speciale</div>'
        + '<div style="font-size:42px;margin-bottom:10px;">📺</div>'
        + '<div style="font-size:19px;font-weight:700;color:#111;line-height:1.3;text-align:center;margin-bottom:10px;">500 canali TV<br>a soli <span style="color:#e00;font-size:24px;">5€</span></div>'
        + '<div style="font-size:13px;color:#444;text-align:center;margin-bottom:10px;">Abbonati a Premium.</div>'
        + '<div style="background:#111;color:#fff;font-size:13px;font-weight:600;padding:10px 28px;border-radius:25px;letter-spacing:0.04em;">Scopri di più →</div>'
        + '</div>';
    box.appendChild(promoBanner);
    overlay.appendChild(box);
    document.body.appendChild(overlay);

    var escapeHandler = function(e) {
        if (e.key === 'Escape') {
            exitFullscreenAndStop();
            overlay.remove();
        }
    };
    document.addEventListener('keydown', escapeHandler, {once: true});
    yesBtn.addEventListener('click', function(){
        document.removeEventListener('keydown', escapeHandler);
        try {
            var isAlternatePlayer = document.getElementById('alternate-video-player');
            if(window.clapprPlayer && typeof window.clapprPlayer.requestFullscreen === 'function'){
                window.clapprPlayer.requestFullscreen();
            } else if(container.requestFullscreen){
                container.requestFullscreen();
            } else {
                Object.assign(container.style, {
                    position:'fixed', top:'0', left:'0', width:'100vw', height:'100vh',
                    backgroundColor:'black', zIndex:'999999'
                });

                if(window.clapprPlayer || isAlternatePlayer){
                    var closeBtn = document.createElement('button');
                    closeBtn.id = 'clappr-close-btn';
                    closeBtn.textContent = 'X CLOSE';
                    closeBtn.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 1000000; padding: 10px 15px; background: rgba(0, 0, 0, 0.5); color: white; border: none; border-radius: 5px; font-size: 16px; font-weight: bold; cursor: pointer;';
                    closeBtn.onclick = exitFullscreenAndStop;
                    document.body.appendChild(closeBtn);
                }
            }
        } catch(e){
            Object.assign(container.style, {
                position:'fixed', top:'0', left:'0', width:'100vw', height:'100vh',
                backgroundColor:'black', zIndex:'999999'
            });
            if(window.clapprPlayer || document.getElementById('alternate-video-player')){
                var closeBtn = document.createElement('button');
                closeBtn.id = 'clappr-close-btn';
                closeBtn.textContent = 'X CLOSE';
                closeBtn.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 1000000; padding: 10px 15px; background: rgba(0, 0, 0, 0.5); color: white; border: none; border-radius: 5px; font-size: 16px; font-weight: bold; cursor: pointer;';
                closeBtn.onclick = exitFullscreenAndStop;
                document.body.appendChild(closeBtn);
            }
        }
        overlay.remove();
    });
    noBtn.addEventListener('click', function(){ 
        document.removeEventListener('keydown', escapeHandler);
        overlay.remove(); 
    });
}


// ================================
// Fullscreen Exit Handler
// ================================
function exitFullscreenAndStop() {
    if (document.fullscreenElement) document.exitFullscreen().catch(function(){});
    var playerContainer = document.getElementById('player');
    
    playerContainer.removeAttribute('style');
    playerContainer.style.height = '';
    playerContainer.style.width = '';
    
    cleanupPlayerInstances();
}

// ================================
// Fallback Strategy Helper
// ================================
var fallbackAttempts = {};
function tryFallback(videoSrc, audioSrc, keyId, keyValue, attemptType = 'primary') {
    var key = videoSrc + '_' + attemptType;
    if (fallbackAttempts[key] >= 2) return;
    fallbackAttempts[key] = (fallbackAttempts[key] || 0) + 1;
    
    cleanupPlayerInstances();
    if (attemptType === 'shaka') {
        window.useClapprPlayer = true;
        window.resumeClapprLoad(videoSrc, audioSrc, keyId, keyValue);
    } else if (attemptType === 'clappr_mpd') {
        window.useClapprPlayer = false;
        window.userSelectedHls = false;
        loadAlternatePlayer(videoSrc, audioSrc, keyId, keyValue);
    } else if (attemptType === 'clappr_m3u8') {
        window.userSelectedHls = false;
        loadAlternatePlayer(videoSrc, audioSrc, keyId, keyValue);
    } else if (attemptType === 'hls') {
        window.useClapprPlayer = true;
        window.resumeClapprLoad(videoSrc, audioSrc, keyId, keyValue);
    }
}

// ================================
// Alternate Player Loading
// ================================
function loadAlternatePlayer(videoSrc, audioSrc, keyId, keyValue, clearKeys){
    var playerContainer = document.getElementById('player');
    var isMPD = videoSrc.indexOf('.mpd') > -1;
    var isM3U8 = videoSrc.indexOf('.m3u8') > -1;
    var effectiveClearKeys = clearKeys || null;
    if (!effectiveClearKeys && keyId && keyValue) {
        effectiveClearKeys = { [keyId]: keyValue };
    }

    if (effectiveClearKeys && isM3U8) {
        if (!checkDependency('shaka', window.shaka)) {
            hideSpinner();
            loadAlternatePlayer(videoSrc, audioSrc, null, null, null);
            return;
        }
        showSpinner(playerContainer);
        var video = document.createElement('video');
        video.id = 'alternate-video-player';
        video.autoplay = true;
        video.muted = true;
        video.controls = true;
        video.style.cssText = 'width:100%;height:100%;';
        playerContainer.appendChild(video);

        if (!window.shaka) {
            hideSpinner();
            console.error('Shaka library missing. Cannot play ClearKey stream.');
            return;
        }
        window.shaka.polyfill.installAll();
        window.shakaPlayer = new window.shaka.Player(video);
        window.shakaPlayer.configure({
            drm: { clearKeys: effectiveClearKeys },
            streaming: {
                rebufferingGoal: 1.5,
                bufferingGoal: 10,
                bufferBehind: 30,
                liveSync: true,
                liveSyncMaxLatency: 4,
                liveSyncMinLatency: 2
            }
        });
        setTimeout(function() {
            window.shakaPlayer.load(videoSrc).then(function() {
                hideSpinner();
                var saved = getSavedVolume();
                video.muted = saved.muted;
                video.volume = saved.volume;
            }).catch(function(err) {
                console.error('Shaka ClearKey HLS failed:', err);
                hideSpinner();
                if (video.canPlayType('application/vnd.apple.mpegurl')) {
                    video.src = videoSrc;
                    video.muted = true;
                    video.addEventListener('canplaythrough', function() { 
                        video.play().catch(function(){}); 
                        hideSpinner(); 
                    }, {once:true});
                }
            });
        }, 500);

        video.addEventListener('play', function(){
            hideSpinner();
            showFullscreenPopup(playerContainer);
        }, {once: true});
        return;
    }

    if (!isMPD && !isM3U8) { hideSpinner(); return; }

    showSpinner(playerContainer);
    var video = document.createElement('video');
    video.id = 'alternate-video-player';
    video.autoplay = true;
    video.muted = true;
    video.controls = true;
    video.style.cssText = 'width:100%;height:100%;';
    playerContainer.appendChild(video);
    if (isMPD) {
        if (!checkDependency('shaka', window.shaka)) {
            hideSpinner();
            tryFallback(videoSrc, audioSrc, keyId, keyValue, 'shaka');
            return;
        }
        
        window.shakaPlayer = new window.shaka.Player(video);
        window.shakaPlayer.configure({
            streaming: {
                rebufferingGoal: 1.5,
                bufferingGoal: 10,
                bufferBehind: 30,
                liveSync: true,
                liveSyncMaxLatency: 4,
                liveSyncMinLatency: 2
            }
        });
        if (effectiveClearKeys) {
            window.shakaPlayer.configure({
                drm: { clearKeys: effectiveClearKeys }
            });
        }

        window.shakaPlayer.load(videoSrc).then(() => {
            window.shakaPlayer.addEventListener('firstquartile', hideSpinner, {once: true});
        }).catch(error => {
            console.error('Shaka failed:', error);
            hideSpinner();
            tryFallback(videoSrc, audioSrc, keyId, keyValue, 'shaka');
        });
    } else if (isM3U8) {
        if (!checkDependency('Hls', window.Hls)) {
            hideSpinner();
            tryFallback(videoSrc, audioSrc, keyId, keyValue, 'hls');
            return;
        }
        if (window.Hls.isSupported()) {
            window.hlsPlayer = new window.Hls();
            video.muted = true;
            window.hlsPlayer.loadSource(videoSrc);
            window.hlsPlayer.attachMedia(video);
            window.hlsPlayer.on(window.Hls.Events.FRAG_BUFFERED, function() { 
            if (video.paused) {
            video.play().catch(() => {});
        }
        hideSpinner();
    });
        window.hlsPlayer.on(window.Hls.Events.ERROR, function() {
                hideSpinner();
                if (window.userSelectedHls) {
                    console.warn('HLS error ignored (user forced HLS mode). Staying on HLS.');
                    return;
                } else {
                    console.warn('HLS failed after Clappr fallback — trying native playback.');
                    if (video.canPlayType('application/vnd.apple.mpegurl')) {
                        video.src = videoSrc;
                        video.muted = true; 
                        video.addEventListener('canplaythrough', function() { 
                            video.play().catch(() => {}); 
                            hideSpinner();
                        }, {once: true});
                        video.addEventListener('error', hideSpinner, {once: true});
                    } else {
                        console.error('HLS not natively supported and Hls.js not working or missing.');
                        hideSpinner();
                        tryFallback(videoSrc, audioSrc, keyId, keyValue, 'hls');
                    }
                }
            });
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
            video.src = videoSrc;
            video.muted = true; 
            video.addEventListener('canplaythrough', function() { 
                video.play().catch(() => {}); 
                hideSpinner();
            }, {once: true});
            video.addEventListener('error', hideSpinner, {once: true});
        } else {
            console.error('HLS not natively supported and Hls.js not working or missing.');
            hideSpinner();
            tryFallback(videoSrc, audioSrc, keyId, keyValue, 'hls');
            return;
        }
    }
    
    video.addEventListener('play', function(){
    var saved = getSavedVolume();
    video.muted = saved.muted;
    video.volume = saved.volume;
    hideSpinner();
    showFullscreenPopup(playerContainer);
}, {once: true});
    var audio = document.getElementById('audio-player');
    if(audioSrc && audio){
        audio.style.display = 'block';
        if (!checkDependency('Hls', window.Hls)) {
            console.warn('HLS library missing. External audio playback may not work.');
        } else if(window.Hls.isSupported()){
            var hls = new window.Hls();
            hls.loadSource(audioSrc);
            hls.attachMedia(audio);
            hls.on(window.Hls.Events.MANIFEST_PARSED, function(){ audio.play()["catch"](function(){}); });
        } else if(audio.canPlayType('application/vnd.apple.mpegurl')){
            audio.src = audioSrc;
            audio.addEventListener('loadedmetadata', function(){ audio.play()["catch"](function(){}); }, {once: true});
        }

        var syncVolume = function(){
            audio.volume = video.volume;
            audio.muted = video.muted;
            saveVolume(video.volume, video.muted);
        };
        video.addEventListener('volumechange', syncVolume);
        
        window.syncInterval = setInterval(function(){
            var videoTime = video.currentTime;
            if(videoTime!==undefined && videoTime!==null && !isNaN(videoTime)){
                var drift = audio.currentTime - videoTime;
                if(Math.abs(drift)>0.5) audio.currentTime = videoTime;
                else if(drift>0.05) audio.playbackRate = 0.98;
                else if(drift<-0.05) audio.playbackRate = 1.02;
                else audio.playbackRate = 1.0;
            }
        },1000);

        if (window.visibilityHandler) {
            document.removeEventListener('visibilitychange', window.visibilityHandler);
        }
        window.visibilityHandler = function(){
            if(!document.hidden){
                audio.currentTime = video.currentTime;
                audio.playbackRate = 1.0;
            }
        };
        document.addEventListener('visibilitychange', window.visibilityHandler);
    }
    // Save volume even when there is no external audio track
if (!audioSrc) {
    video.addEventListener('volumechange', function() {
        saveVolume(video.volume, video.muted);
    });
}
}

// ================================
// Global resumeClapprLoad function
// ================================
window.resumeClapprLoad = function(videoSrc, audioSrc, keyId, keyValue, clearKeys) {
    var playerContainer = document.getElementById('player');
    cleanupPlayerInstances();

    showSpinner(playerContainer);

    if (clearKeys && Object.keys(clearKeys).length > 0) {
        var isM3U8ck = videoSrc.indexOf('.m3u8') > -1;
        var isMPDck  = videoSrc.indexOf('.mpd')  > -1;
        if (isM3U8ck || isMPDck) {
            loadAlternatePlayer(videoSrc, audioSrc, null, null, clearKeys);
            return;
        }
    }

    if (window.useClapprPlayer) {
    window.userSelectedHls = false;
        if (!checkDependency('Clappr', window.Clappr)) {
            var isMPD = videoSrc.indexOf('.mpd') > -1;
            hideSpinner();
            tryFallback(videoSrc, audioSrc, keyId, keyValue, isMPD ? 'clappr_mpd' : 'clappr_m3u8');
            return;
        }

        var audio = document.getElementById('audio-player');
        var isMPD = videoSrc.indexOf('.mpd') > -1;
        if(audio){
            audio.style.display = audioSrc ? 'block' : 'none';
            if(audioSrc){
                if (!checkDependency('Hls', window.Hls)) {
                    console.warn('HLS library missing. External audio playback may not work.');
                } else if(window.Hls.isSupported()){
                    var hls = new window.Hls();
                    hls.loadSource(audioSrc);
                    hls.attachMedia(audio);
                    hls.on(window.Hls.Events.MANIFEST_PARSED, function(){ audio.play()["catch"](function(){}); });
                } else if(audio.canPlayType('application/vnd.apple.mpegurl')){
                    audio.src = audioSrc;
                    audio.addEventListener('loadedmetadata', function(){ audio.play()["catch"](function(){}); }, {once: true});
                }
            }
        }
        
        var playerOpts = {
            source: videoSrc,
            parentId: "#player",
            autoPlay: true,
            mute: true,
            height: "100%",
            width: "100%",
            plugins: getClapprPlugins(),
        };
        if(isMPD){
            playerOpts.playback = window.Clappr.DashShakaPlayback;
            if(keyId && keyValue){
                playerOpts.shakaConfiguration = {
                    drm: { clearKeys: { [keyId]: keyValue } }
                };
            }
        } else {
            playerOpts.playback = {
                hlsjsConfig: {
                    maxBufferLength: 10,
                    liveSyncDurationCount: 3,
                    enableWorker: false,
                    abrEwmaFastLiveLatency: 2, 
                    abrEwmaSlowLiveLatency: 4
                }
            };
        }
    
        try {
            window.clapprPlayer = new window.Clappr.Player(playerOpts);
            window.clapprPlayer.once(window.Clappr.Events.PLAYER_PLAY, function(){
    hideSpinner();
    try {
        var saved = getSavedVolume();
        if (saved.muted) {
            window.clapprPlayer.mute();
        } else {
            window.clapprPlayer.unmute();
            window.clapprPlayer.setVolume(saved.volume * 100);
        }
        showFullscreenPopup(playerContainer);
    } catch(e){
        showFullscreenPopup(playerContainer);
    }
});
            window.clapprPlayer.on(window.Clappr.Events.ERROR, hideSpinner);
        } catch(e) {
            hideSpinner();
            console.error('Clappr init failed:', e);
            var attemptType = isMPD ? 'clappr_mpd' : 'clappr_m3u8';
            tryFallback(videoSrc, audioSrc, keyId, keyValue, attemptType);
        }
        
        if(audioSrc){
    window.clapprPlayer.on(window.Clappr.Events.PLAYER_VOLUMEUPDATE, function(payload){
        var volPercent = (typeof payload==='number') ? payload : (payload && typeof payload.volume==='number' ? payload.volume : window.clapprPlayer.getVolume());
        var vol01 = Math.max(0, Math.min(1, volPercent/100));
        audio.volume = vol01;
        audio.muted = volPercent === 0;
        saveVolume(vol01, volPercent === 0);
    });
    window.clapprPlayer.on(window.Clappr.Events.PLAYER_MUTE, function(){
        var isMuted = window.clapprPlayer.getVolume() === 0;
        audio.muted = isMuted;
        saveVolume(window.clapprPlayer.getVolume() / 100, isMuted);
    });
            window.syncInterval = setInterval(function(){
                var videoTime = (window.clapprPlayer.core && window.clapprPlayer.core.getCurrentTime ? window.clapprPlayer.core.getCurrentTime() : null);
                if(videoTime!==undefined && videoTime!==null && !isNaN(videoTime)){
                    var drift = audio.currentTime - videoTime;
                    if(Math.abs(drift)>0.5) audio.currentTime = videoTime;
                    else if(drift>0.05) audio.playbackRate = 0.98;
                    else if(drift<-0.05) audio.playbackRate = 1.02;
                    else audio.playbackRate = 1.0;
                }
            },1000);

            if (window.visibilityHandler) {
                document.removeEventListener('visibilitychange', window.visibilityHandler);
            }
            window.visibilityHandler = function(){
                if(!document.hidden && window.clapprPlayer.core && window.clapprPlayer.core.getCurrentTime){
                    audio.currentTime = window.clapprPlayer.core.getCurrentTime();
                    audio.playbackRate = 1.0;
                }
            };
            document.addEventListener('visibilitychange', window.visibilityHandler);
        }
    } else {
        loadAlternatePlayer(videoSrc, audioSrc, keyId, keyValue);
    }
};

// ================================
// Player Switcher Function (Debounced)
// ================================
var debouncedSwitchPlayer = debounce(function() {
    window.useClapprPlayer = !window.useClapprPlayer;
    window.userSelectedHls = !window.useClapprPlayer;
    console.log('Player Switched. Current Player is: ' + (window.useClapprPlayer ? 'Clappr' : 'Shaka/Hls.js'));

    var lastLink = document.querySelector('#link-list a.active-link');
    if (lastLink) {
        cleanupPlayerInstances();
        var audioSrc = lastLink.getAttribute('data-audio') || null;
        var videoSrc = lastLink.getAttribute('data-video') || lastLink.href;
        var keyId = lastLink.getAttribute('data-key-id');
        var keyValue = lastLink.getAttribute('data-key-value');
        
        window.resumeClapprLoad(videoSrc, audioSrc, keyId, keyValue);
    } else {
        cleanupPlayerInstances();
    }
    
    var switchBtn = document.getElementById('switch-player-btn');
    if (switchBtn) {
        switchBtn.textContent = window.useClapprPlayer ? 'Opzione 2' : 'Opzione 1';
    }
}, 100);

window.switchPlayer = debouncedSwitchPlayer;

// ================================
// Link click handling (with new mobile popup logic)
// ================================
var allBtns = document.querySelectorAll('#link-list a');
for(var i=0;i<allBtns.length;i++){
    allBtns[i].addEventListener('click', function(e){
        if(["pwa-link", "pwa-link2", "not-pwa-link"].indexOf(this.id) !== -1) return;

        e.preventDefault();
        
        document.querySelectorAll('#link-list a').forEach(function(a) { a.classList.remove('active-link'); });
        this.classList.add('active-link');

        var playerContainer = document.getElementById('player');

        var fakePlayer = document.querySelector('.fake-player');
        if(fakePlayer){ fakePlayer.style.display="none"; }

        var oldIframe = playerContainer.querySelector('iframe');
        if(oldIframe) oldIframe.remove();

        cleanupPlayerInstances();
        forceReleaseDRM();

        // Always start new streams in Opzione 1 (Clappr)
        window.useClapprPlayer = true;          // primary
        window.userSelectedHls = false;         // this HLS is NOT user-selected
        var switchBtn = document.getElementById('switch-player-btn');
        if (switchBtn) switchBtn.textContent = 'Opzione 2'; // reflect UI state

        var rawVideoSrc = this.getAttribute('data-video') || this.href;
        var rawAudioSrc = this.getAttribute('data-audio') || null;
        var rawIsM3U8 = rawVideoSrc.indexOf('.m3u8') > -1;
        var rawIsMPD = rawVideoSrc.indexOf('.mpd') > -1;
        var rawClearKey = extractZapprClearkeyData(rawVideoSrc);
        var isWebpage = !rawIsM3U8 && !rawIsMPD && !rawAudioSrc && !rawClearKey;
        if (isWebpage) {
            var audio = document.getElementById('audio-player');
            if(audio) audio.style.display='none';
            var iframe = document.createElement('iframe');
            iframe.src = rawVideoSrc;
            iframe.style.width = '100%';
            iframe.style.border = 'none';
            iframe.setAttribute('allowfullscreen','');
            if (isTV()) {
                iframe.style.height = '480px';
                iframe.style.transform = 'scale(1.5)';
                iframe.style.transformOrigin = 'top left';
            } else {
                iframe.style.height = window.innerWidth <= 768 ? '600px':'800px';
            }
            playerContainer.style.position='relative';
            playerContainer.appendChild(iframe);
            return;
        }

        // --- START OF NEW SMART DETECTOR ---
var clearkeyData = extractZapprClearkeyData(rawVideoSrc);      
var videoSrc, audioSrc, keyId, keyValue, clearKeys;

if (clearkeyData) {
    videoSrc = clearkeyData.video;
    clearKeys = clearkeyData.keys; // Pass it explicitly into the clearKeys variable
    keyId = null;
    keyValue = null;
    audioSrc = null;    
    } else {
    audioSrc = this.getAttribute('data-audio') || null;
    videoSrc = rawVideoSrc;
    keyId = this.getAttribute('data-key-id');
    keyValue = this.getAttribute('data-key-value');
    clearKeys = null;
}
// --- END OF NEW SMART DETECTOR ---

        var isMPD = videoSrc && videoSrc.indexOf('.mpd') > -1;
        
        if (!videoSrc) {
        console.error('No video source found for link');
        var nextStream = getNextStreamLink(null);
        if (nextStream) {
            window.resumeClapprLoad(nextStream.video, nextStream.audio);
            return;
        }
        return;
    }
        
    if(this.classList.contains('iframe-link')){
        var audio = document.getElementById('audio-player');
        if(audio) audio.style.display='none';
        var iframe = document.createElement('iframe');
        iframe.src = videoSrc;
        iframe.style.width = '100%';
        iframe.style.border = 'none';
        iframe.setAttribute('allowfullscreen','');
        if (isTV()) {
            iframe.style.height = '480px';
            iframe.style.transform = 'scale(1.5)';
            iframe.style.transformOrigin = 'top left';
        } else {
            iframe.style.height = window.innerWidth <= 768 ? '600px':'800px';
        }
            
        playerContainer.style.position='relative';
        playerContainer.appendChild(iframe);
        return;
    }
        
    // Standard execution block handling both old 4-key variables and the new clearKeys variable
    if (isMPD && (keyId || clearKeys) && this.classList.contains('stream-link')) {
        window.resumeClapprLoad(videoSrc, audioSrc, keyId, keyValue, clearKeys);
        return;
    }

    var ua = navigator.userAgent.toLowerCase();
    var isMobile = /android|iphone|ipad|ipod/.test(ua);
    if (isMobile || isTV()) { 
        if (clearKeys) {
            showPlayChoicePopup(videoSrc, audioSrc, null, null, clearKeys);
        } else {
            showPlayChoicePopup(videoSrc, audioSrc, keyId, keyValue, null);
        }
    } else {
        if (clearKeys) {
            window.resumeClapprLoad(videoSrc, audioSrc, null, null, clearKeys);
        } else {
            window.resumeClapprLoad(videoSrc, audioSrc, keyId, keyValue, null);
        }
    }
});
}

// ================================
// Navigation logic helpers (stream list navigation)
// ================================
window.streamLinks = [];
window.currentStreamIndex = -1;

function getNextStreamLink(currentVideoSrc) {
    initializeStreamLinks(currentVideoSrc);
    if (window.streamLinks.length === 0) return null;
    
    var startIndex = window.currentStreamIndex;
    var nextIndex = (startIndex + 1) % window.streamLinks.length;
    var attempts = 0;

    while (nextIndex !== startIndex && attempts++ < window.streamLinks.length) {
        var candidate = window.streamLinks[nextIndex];
        if (!currentVideoSrc || candidate.video !== currentVideoSrc) {
            window.currentStreamIndex = nextIndex;
            return candidate;
        }
        nextIndex = (nextIndex + 1) % window.streamLinks.length;
    }
    return null;
}

function initializeStreamLinks(currentVideoSrc) {
    window.streamLinks = [];
    var allLinks = document.querySelectorAll('#link-list a');
    for(var i=0; i<allLinks.length; i++){
        var btn = allLinks[i];
        if(["pwa-link", "pwa-link2", "not-pwa-link"].indexOf(btn.id) !== -1) continue;
        
        var linkVideoSrc = btn.getAttribute('data-video') || btn.href;
        var linkAudioSrc = btn.getAttribute('data-audio') || null;
        var isM3U8 = linkVideoSrc.indexOf('.m3u8') > -1;
        var isMPD = linkVideoSrc.indexOf('.mpd') > -1;
        
        // Extract multi-key data once right here during initialization
        var clearKeyData = extractZapprClearkeyData(linkVideoSrc);
        var isClearKey = clearKeyData !== null;
        var isWebpage = !isM3U8 && !isMPD && !linkAudioSrc && !isClearKey;
        
        if (!isWebpage){
            var linkData = { 
                // FIXED: Extracts the actual streaming payload URL if it's a ClearKey wrapper!
                video: isClearKey ? clearKeyData.video : linkVideoSrc, 
                audio: linkAudioSrc,
                keyId: btn.getAttribute('data-key-id'),
                keyValue: btn.getAttribute('data-key-value'),
                // Store keys directly so next/previous buttons can read them instantly
                clearKeys: isClearKey ? clearKeyData.keys : null,
                isClearKey: isClearKey
            };
            window.streamLinks.push(linkData);
            if (linkVideoSrc === currentVideoSrc || (isClearKey && clearKeyData.video === currentVideoSrc)) {
                window.currentStreamIndex = window.streamLinks.length - 1;
            }
        }
    }
}

window.playNextStream = function(currentVideoSrc) {
    if (window.streamLinks.length === 0 || currentVideoSrc !== (window.streamLinks[window.currentStreamIndex] ? window.streamLinks[window.currentStreamIndex].video : null)) {
        initializeStreamLinks(currentVideoSrc);
    }
    if (window.streamLinks.length === 0) return;
    
    var nextIndex = (window.currentStreamIndex + 1) % window.streamLinks.length;
    var nextStream = window.streamLinks[nextIndex];
    if (nextStream) {
        window.currentStreamIndex = nextIndex;
        // Fixed to read the pre-saved keys instantly
        if (nextStream.isClearKey && nextStream.clearKeys) {
            window.resumeClapprLoad(nextStream.video, nextStream.audio, null, null, nextStream.clearKeys);
        } else {
            window.resumeClapprLoad(nextStream.video, nextStream.audio, nextStream.keyId, nextStream.keyValue);
        }
    }
};

window.playPreviousStream = function(currentVideoSrc) {
    if (window.streamLinks.length === 0 || currentVideoSrc !== (window.streamLinks[window.currentStreamIndex] ? window.streamLinks[window.currentStreamIndex].video : null)) {
        initializeStreamLinks(currentVideoSrc);
    }
    if (window.streamLinks.length === 0) return;
    
    var previousIndex = (window.currentStreamIndex - 1 + window.streamLinks.length) % window.streamLinks.length;
    var previousStream = window.streamLinks[previousIndex];
    if (previousStream) {
        window.currentStreamIndex = previousIndex;
        // Fixed to read the pre-saved keys instantly
        if (previousStream.isClearKey && previousStream.clearKeys) {
            window.resumeClapprLoad(previousStream.video, previousStream.audio, null, null, previousStream.clearKeys);
        } else {
            window.resumeClapprLoad(previousStream.video, previousStream.audio, previousStream.keyId, previousStream.keyValue);
        }
    }
};

// ================================
// NEW: Popup for choosing Web/Native on Mobile (Blogger-safe Ad)
// ================================
function showPlayChoicePopup(videoSrc, audioSrc, keyId, keyValue, clearKeys) {
    var ua = navigator.userAgent.toLowerCase();
    var isAndroid = /android/.test(ua);
    var isIOS = /iphone|ipad|ipod/.test(ua);

    var overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);display:flex;justify-content:center;align-items:center;z-index:999999;';
    
    var box = document.createElement('div');
    box.style.cssText = 'background:#fff;padding:18px;border-radius:10px;text-align:center;max-width:90%;box-shadow:0 6px 24px rgba(0,0,0,0.3);';
    
    var title = document.createElement('div');
    title.textContent = 'Riprodurre con Web o Native?';
    title.style.cssText = 'margin-bottom:12px;font-size:16px;font-weight:600;color:#111;';
    box.appendChild(title);

    var infoLine = document.createElement('div');
    infoLine.textContent = 'In "Native" scegli il tuo proprio Player';
    infoLine.style.cssText = 'font-size:12px;color:#444;margin-bottom:12px;';
    box.appendChild(infoLine);
    var btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin-bottom:28px;';
    
    var webBtn = document.createElement('button');
    webBtn.textContent = 'Web Player';
    webBtn.style.cssText = 'padding:10px 14px;border-radius:8px;border:none;background:#007bff;color:white;font-size:14px;cursor:pointer;';
    webBtn.onclick = function() {
        document.body.removeChild(overlay);
        window.resumeClapprLoad(videoSrc, audioSrc, keyId, keyValue, clearKeys);
    };
    btnRow.appendChild(webBtn);
    if (isAndroid) {
        var nativeBtn = document.createElement('button');
        nativeBtn.textContent = 'Native Player';
        nativeBtn.style.cssText = 'padding:10px 14px;border-radius:8px;border:none;background:#28a745;color:white;font-size:14px;cursor:pointer;';
        nativeBtn.onclick = function() {
            document.body.removeChild(overlay);
            var stripped = videoSrc.replace(/^https?:\/\//,'');
            window.location.href = 'intent://' + stripped + '#Intent;scheme=https;type=video/*;end';
        };
        btnRow.appendChild(nativeBtn);
    } else if (isIOS) {
        var vlcBtn = document.createElement('button');
        vlcBtn.textContent = 'VLC';
        vlcBtn.style.cssText = 'padding:10px 14px;border-radius:8px;border:none;background:#000;color:white;font-size:14px;cursor:pointer;';
        vlcBtn.onclick = function() {
            document.body.removeChild(overlay);
            window.location.href = 'vlc://' + videoSrc;
        };
        btnRow.appendChild(vlcBtn);

        var infuseBtn = document.createElement('button');
        infuseBtn.textContent = 'Infuse';
        infuseBtn.style.cssText = 'padding:10px 14px;border-radius:8px;border:none;background:#ff6a00;color:white;font-size:14px;cursor:pointer;';
        infuseBtn.onclick = function() {
            document.body.removeChild(overlay);
            window.location.href = 'infuse://x-callback-url/play?url=' + encodeURIComponent(videoSrc);
        };
        btnRow.appendChild(infuseBtn);
    }

    box.appendChild(btnRow);
    var promoBanner = document.createElement('a');
    promoBanner.href = 'https://www.kritere.com/p/iptv.html';
    promoBanner.target = '_blank';
    promoBanner.rel = 'noopener noreferrer';
    promoBanner.style.cssText = 'display:block;width:300px;height:250px;margin:10px auto 0;border-radius:10px;background:#ffffff;border:1.5px solid #e0e0e0;text-decoration:none;box-shadow:0 2px 12px rgba(0,0,0,0.10);overflow:hidden;';
    promoBanner.innerHTML = ''
        + '<div style="width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;box-sizing:border-box;">'
        + '<div style="font-size:13px;font-weight:600;color:#888;letter-spacing:0.12em;text-transform:uppercase;margin-bottom:10px;">Offerta speciale</div>'
        + '<div style="font-size:42px;margin-bottom:10px;">📺</div>'
        + '<div style="font-size:19px;font-weight:700;color:#111;line-height:1.3;text-align:center;margin-bottom:10px;">500 canali TV<br>a soli <span style="color:#e00;font-size:24px;">5€</span></div>'
        + '<div style="font-size:13px;color:#444;text-align:center;margin-bottom:10px;">Abbonati a Premium.</div>'
        + '<div style="background:#111;color:#fff;font-size:13px;font-weight:600;padding:10px 28px;border-radius:25px;letter-spacing:0.04em;">Scopri di più →</div>'
        + '</div>';
    box.appendChild(promoBanner);

    overlay.appendChild(box);
    document.body.appendChild(overlay);
}




