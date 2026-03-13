// 1. Firebase Configuration (NEVER REMOVE THIS)
var firebaseConfig = {
  apiKey: "AIzaSyD5DcR_ukquHZnuH-NdXn5E3P8v8Je0lRU",
  authDomain: "apprating-62fe7.firebaseapp.com",
  databaseURL: "https://apprating-62fe7-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "apprating-62fe7",
  storageBucket: "apprating-62fe7.firebasedatabase.app",
  messagingSenderId: "1096392399049",
  appId: "1:1096392399049:web:b4232e4d00aeb719efd518"
};
firebase.initializeApp(firebaseConfig);
var db = firebase.database();

// 2. Variables
var stars = document.querySelectorAll('.star');
var averageRating = document.getElementById('averageRating');
var voteMessage = document.getElementById('voteMessage');

// 3. Load ratings from Firebase
function loadRatings(){
  db.ref('ratings').once('value', function(snapshot){
    var data = snapshot.val();
    if(!data){
      // Initialize if empty
      db.ref('ratings').set({1:0,2:0,3:0,4:0,5:0}, function(err){
        if(!err) loadRatings();
      });
      return;
    }
    updateUI(data);
  });
}

// 4. Smart UI Logic (Hides average for new voters)
function updateUI(ratings){
  var sum = 0, total = 0;
  for(var i=1; i<=5; i++){
    var count = ratings[i] || 0;
    sum += i * count;
    total += count;
  }
  var avg = total ? sum / total : 0;
  var hasVoted = localStorage.getItem('voted');

  if(hasVoted) {
    // DISPLAY FOR VOTED USERS: Show gold stars and text
    stars.forEach(function(star, index){
      if((index + 1) <= Math.round(avg)) star.classList.add('filled');
      else star.classList.remove('filled');
    });
    averageRating.style.display = 'block';
    averageRating.innerHTML = "Media: " + avg.toFixed(1) + " ⭐ (" + total + " voti)";
    voteMessage.textContent = "Hai già votato!";
  } else {
    // DISPLAY FOR NEW USERS: Keep stars gray and hide text
    stars.forEach(function(star){ star.classList.remove('filled'); });
    averageRating.style.display = 'none';
    voteMessage.textContent = "";
  }
}

// 5. Voting Logic
stars.forEach(function(star){
  star.addEventListener('click', function(){
    if(localStorage.getItem('voted')) return;
    
    var value = this.getAttribute('data-value');
    db.ref('ratings/' + value).transaction(function(curr){
      return (curr || 0) + 1;
    }, function(error, committed){
      if(committed){
        localStorage.setItem('voted','true');
        voteMessage.textContent = "Grazie per il voto!";
        
        // Refresh UI to show the average now that they've voted
        loadRatings(); 
        
        setTimeout(function(){ 
          document.getElementById('ratingPopup').style.display='none'; 
        }, 1500);
      }
    });
  });
});

// 6. Popup Controls
document.querySelector('.star-button')?.addEventListener('click', function(e){
  e.preventDefault();
  document.getElementById('ratingPopup').style.display = 'flex';
  loadRatings(); 
});

document.getElementById('closePopupBtn')?.addEventListener('click', function(){
  document.getElementById('ratingPopup').style.display = 'none';
});

// Run load immediately
loadRatings();