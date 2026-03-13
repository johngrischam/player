// ---------------- GET USER IP ----------------
function getUserIP(callback) {
  fetch("https://api.ipify.org?format=json")
    .then(res => res.json())
    .then(data => {
       var ip = data.ip;
       callback(ip);
    })
    .catch(() => callback("unknown"));
}

// ---------------- SEND TO GOOGLE SHEET ----------------
function sendPollWithIP(answer, pageId, ip) {
  fetch("https://script.google.com/macros/s/AKfycbyztHHuZGHu9FmHtvKRqm4E4SQI9Nv7FUDM6FggjFBRQdGlr_6Ko3ZH-W_JnqtmYrCL7w/exec", {
    method: "POST",
    mode: "no-cors",
    body: new URLSearchParams({
      answer: answer,
      page: pageId,
      ip: ip
    })
  });
}

// ---------------- SEND ANSWER ----------------
function sendAnswer(ans, pageId) {
  var container = document.getElementById("poll-container");

  if (ans === "No") {
    container.innerHTML = "⏳ Attendere una risposta da parte di KriTere AI ...";
    setTimeout(function() {
      container.innerHTML = "<p>❌ Quale canale NON funziona?</p>";
      showNameOptions(pageId);
    }, 2000);
  } else {
    container.innerHTML = "⏳ Attendere una risposta da parte di KriTere AI ...";

    getUserIP(function(ip){
      sendPollWithIP(ans, pageId, ip);
      container.innerHTML = "✅ Fantastico! Ti svelerò un segreto: Scarica <b>Android App</b> per Firestick e TV box.";
    });
  }
}

// ---------------- SHOW CHANNEL OPTIONS ----------------
function showNameOptions(pageId) {
  var container = document.getElementById("poll-container");
  var names = ["RAI 1", "RAI 2", "Canale 5", "Rete 4", "Italia 1", "TV8", "Altri"];

  // Clear previous buttons
  container.querySelectorAll('button').forEach(function(b){ b.remove(); });

  names.forEach(function(name) {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = name;
    btn.style.margin = "5px";

    if (name === "Altri") {
      btn.addEventListener("click", function() { showOtherInput(pageId); });
    } else {
      btn.addEventListener("click", function() { sendNameChoice(name, pageId); });
    }

    container.appendChild(btn);
  });
}

// ---------------- SHOW OTHER INPUT ----------------
function showOtherInput(pageId) {
  var container = document.getElementById("poll-container");

  // Remove existing input container if any
  var existing = document.getElementById('other-input-wrapper');
  if(existing) existing.remove();

  var wrapper = document.createElement('div');
  wrapper.id = 'other-input-wrapper';
  wrapper.style.display = 'flex';
  wrapper.style.gap = '8px';
  wrapper.style.marginTop = '10px';
  wrapper.style.marginBottom = '18px';

  var input = document.createElement('input');
  input.type = 'text';
  input.id = 'other-channel-input';
  input.placeholder = 'Scrivi il nome del canale';
  input.setAttribute('list', 'channel-list'); 
  input.style.flex = '1';
  input.style.padding = '8px';
  input.style.fontSize = '14px';
  input.style.border = '1px solid #ccc';
  input.style.borderRadius = '6px';

  // Create empty datalist
  var dataList = document.createElement('datalist');
  dataList.id = 'channel-list';

  var suggestions = [
    "Rai Movie", "Rai Storia", "Rai Scuola", "Rai News", "Rai 4", "Rai 3",
    "Rai Premium", "Rai Sport", "Rai Gulp", "TG Com", "20 Mediaset", "Iris",
    "Twenty Seven", "La 5", "Cine 34", "Focus", "Top Crime", "Boing",
    "Italia 2", "Mediaset Extra", "La7", "La7 Cinema", "RSI 1", "RSI 2",
    "Sky Uno", "Cielo", "Sky TG 24", "Nove", "Discovery", "DMAX",
    "Giallo", "Real Time", "HGTV", "Motor Trend", "Food Network", "Gambero Rosso",
    "Frisbee", "K2", "Cartoonito", "Super!", "LG1", "LG1 Film",
    "Film Top", "Film Divertenti", "Film Romantici", "Film Commedia", "Film Asiatici", "LG1 Spotlight",
    "Film Dramma", "Film Azione", "Film Fantascienza", "Risate Cult", "Smile", "CG Grandi Film",
    "Film Popolari", "Alberto Sordi e Co", "Cinema Italiano", "Grandi Nomi", "CineWestern", "Alta Tensione",
    "Brividi Cinema", "Serie Thriller", "True Crime", "Serie Crime", "SoloCalcio", "SportItalia",
    "Super Tennis", "RedBull", "FIFA+", "Italian Fishing", "Salto Ostacoli", "RBN TV",
    "Golf TV", "DFB TV", "WPT", "Sky Comedy", "Sky Suspens",
    "Sky Drama", "Sky Family", "Sky Romance", "Sky Cine 24", "Sky Action", "Sky Sport 1",
    "Sky Tennis", "Sky F1", "Sky MotoGP", "Sky Calcio", "DAZN", "Sky Sport 24"
  ];

  // Logic to only show items that START with the user's input
  input.addEventListener('input', function() {
    var val = this.value.toLowerCase();
    dataList.innerHTML = ''; // Keep it empty by default
    
    if (val.length > 0) {
      suggestions.forEach(function(item) {
        // Check if the item STARTS with the typed string
        if (item.toLowerCase().startsWith(val)) {
          var option = document.createElement('option');
          option.value = item;
          dataList.appendChild(option);
        }
      });
    }
  });

  var sendBtn = document.createElement('button');
  sendBtn.type = 'button';
  sendBtn.textContent = 'INVIA';
  sendBtn.style.padding = '8px 14px';
  sendBtn.style.fontSize = '14px';
  sendBtn.style.background = '#2196f3';
  sendBtn.style.color = 'white';
  sendBtn.style.border = 'none';
  sendBtn.style.borderRadius = '6px';
  sendBtn.style.cursor = 'pointer';

  sendBtn.addEventListener('click', function(){ sendOtherName(pageId); });

  wrapper.appendChild(input);
  wrapper.appendChild(dataList); 
  wrapper.appendChild(sendBtn);
  container.appendChild(wrapper);

  setTimeout(function() { try { input.focus(); } catch(e){} }, 50);
}
// ---------------- SEND OTHER NAME ----------------
function sendOtherName(pageId) {
  var container = document.getElementById("poll-container");
  var value = document.getElementById("other-channel-input").value.trim();

  if (!value) { alert('Per favore inserisci un nome.'); return; }

  container.innerHTML = "⏳ Attendere una soluzione da KriTere AI ...";

  getUserIP(function(ip){
    sendPollWithIP("No - " + value, pageId, ip);
    container.innerHTML =
  "<div>💬 KriTere AI suggerisce:</div>" +
  "<div><b>-</b>Hai provato <b>Opzione 2</b> su <b>ogni</b> link TV con tag 🟢?</div>" +
  "<div><b>-</b>Hai usato una <b>VPN</b> sui link TV con tag 🟡?</div>" +
  "<div><b>-</b>Hai installato <b>KriTere App</b> per guardare <b>Sky e Dazn</b>?</div>" +
  "<div>Se rispondi “Sì” ma la TV non si apre, <b>commenta a fine pagina</b> per assistenza con: <b>" + value + "</b></div>";
  });
}

// ---------------- SEND NAME CHOICE ----------------
function sendNameChoice(name, pageId) {
  var container = document.getElementById("poll-container");
  container.innerHTML = "⏳ Attendere una soluzione da parte di KriTere AI ...";

  getUserIP(function(ip){
    sendPollWithIP("No - " + name, pageId, ip);
    container.innerHTML = 
  "<div>💬 KriTere AI suggerisce:</div>" +
  "<div><b>-</b>Hai provato <b>Opzione 2</b> su <b>ogni</b> link TV con tag 🟢?</div>" +
  "<div><b>-</b>Hai usato una <b>VPN</b> sui link TV con tag 🟡?</div>" +
  "<div><b>-</b>Hai installato <b>KriTere App</b> per guardare <b>Sky e Dazn</b>?</div>" +
  "<div>Se rispondi “Sì” ma la TV non si apre, <b>commenta a fine pagina</b> per assistenza con: <b>" + name + "</b></div>";
  });
}

