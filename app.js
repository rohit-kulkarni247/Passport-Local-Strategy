//jshint esversion:6

require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require('express-session');
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate= require("mongoose-findorcreate");
const LocalStrategy = require("passport-local").Strategy;
const flash= require("connect-flash");
const app = express();
const https=require("https");

app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended: true}));

app.use(session({
  secret:"this is my secret.",
  resave:false,
  saveUninitialized:false
}));

app.use(passport.initialize());
app.use(passport.session());
app.use(flash());


mongoose.connect("mongodb://localhost:27017/formsDB" , {useUnifiedTopology:true, useNewUrlParser: true } );
mongoose.set('useCreateIndex', true);

const loginSchema = new mongoose.Schema({
  username: String,
  password: String,
  phoneno: Number,
  googleId: String
});

loginSchema.plugin(passportLocalMongoose);
loginSchema.plugin(findOrCreate);

const User = new mongoose.model("User", loginSchema);

// passport.use(User.createStrategy());

passport.use(
  new LocalStrategy({ username: 'username',passReqToCallback: true }, (req,username,password, done) => {
    // Match user

    https.get(process.env.CLIENT_URL,function(response){
      response.on("data", function(data){
        res.send(JSON.parse(data));
      })
    });
    User.findOne({username: username})
      .then(user => {
        if (!user) {
          return done(null, false, { message: 'That email is not registered' });
        }
        // console.log(req.body.phone);
        if(password==user.password){

          if(user.phoneno==req.body.phone){
            return done(null, user);
          }
          else {
            return done(null, false, { message: 'Password incorrect' });
          }
        }
        else {
          return done(null, false, { message: 'Password incorrect' });
        }
      })
      .catch(err => console.log(err));
  })
);

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/forms",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

app.get("/quizdata",function(req, res){
  https.get(process.env.CLIENT_URL,function(response){
    response.on("data", function(data){
      res.send(JSON.parse(data));
    })
  });
});

app.get("/",function(req,res){
  res.render("first");
});

app.get("/login",function(req,res){
  res.render("login");
});

app.get("/signup",function(req,res){
  res.render("signup");
});

app.get("/next",function(req,res){
  if(req.isAuthenticated()){
    res.render("next");
  }
  else{
    res.redirect("/");
  }
});

app.get("/auth/google",
  passport.authenticate("google", { scope: ["profile"] }));

app.get("/auth/google/forms",
  passport.authenticate("google", { failureRedirect: "/" }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect("/next");
  });

app.post("/signup",function(req,res){

  const { username, password, phone } = req.body;
  const newUser = new User({
    username,
    password, 
    phoneno:phone
  });

  newUser.save()
      .then(user => {console.log('You are now registered and can log in');
          res.redirect('/login');
      })
      .catch(err => console.log(err));
});


app.post("/login", function(req, res,next){
  passport.authenticate("local", {
    successRedirect: '/next',
    failureRedirect: '/login',
    failureFlash: true
  })(req, res, next);
});

app.get("/logout", function(req, res){
  req.logout();
  res.redirect("/");
});



app.listen(3000, function() {
  console.log("Server started on port 3000.");
});
