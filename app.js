require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require('mongoose');
const session = require('express-session');
const RedisStore = require('connect-redis')(session);
const passport = require('passport');
const passportLocalMongoose = require('passport-local-mongoose');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');
const nodemailer = require('nodemailer');
const crypto = require('crypto');

const saltRounds = 10;

const app = express();

app.set("view engine", "ejs");

mongoose.set('strictQuery', false);
app.use(express.static('public'));
app.use(bodyParser.urlencoded({
  extended: true
}));

app.use(session({

  secret: "Our little secret",
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());


// http://localhost:3000/auth/google/secrets
// mongodb://127.0.0.1:27017/practiceDB
mongoose.connect("mongodb+srv://Omayrtwelve:Pakistan12345@cluster0.u2kme3d.mongodb.net/practiceDB", {
  useNewUrlParser: true,
  useUnifiedTopology: true
}, function(err) {
  if (err) {
    console.log("Error connecting to MongoDB:", err);
  } else {
    console.log("Successfully connected to MongoDB");
  }
});

/////////////////////// This Schema is used for account registeration login/register ////////////////////////
const schema = new mongoose.Schema({
  name: String,
  username: String,
  password: String,
  googleId: String,
  secret: String,
  resetToken: String,
  resetTokenExpiration: Date

  // repeatPassword: String

});

schema.plugin(passportLocalMongoose);
schema.plugin(findOrCreate);

/////////////////////// This Model is used for account registeration login/register ////////////////////////
const LoginDetails = mongoose.model('LoginDetails', schema);


passport.use(LoginDetails.createStrategy());

passport.serializeUser(function(user, cb) {
  process.nextTick(function() {
    cb(null, {
      id: user.id,
      username: user.username,
      name: user.name,
    });
  });
});

passport.deserializeUser(function(user, cb) {
  process.nextTick(function() {
    return cb(null, user);
  });
});

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets"
  },
  function(accessToken, refreshToken, email, cb) {

    // console.log(email.emails[0].value);

    LoginDetails.findOrCreate({
      username: email.emails[0].value
    }, function(err, user) {
      return cb(err, user);
    });
  }
));

const productSchema = new mongoose.Schema({
  name: String,
  dob: String,
  phone: String,
  gender: String,
  weight: Number,
  bloodtype: String,
  hospitals:String,
  phoneemergency:String,
  bloodreason:String
});
const Donor = mongoose.model('Donor', productSchema);

app.post("/donor", function(req, res) {
   const { name, dob, phone, gender, weight, bloodtype } = req.body;

  // console.log(name, dob, phone, gender, weight, bloodtype);
  Donor.findOne({ name, phone, bloodtype }, function(err, donor) {
     if (err) {
       return res.status(500).send("Error Finding the donor in the database");
     }
     if (donor) {
        return res
          .status(400)
          .send("Data already available with the same information");
      }

    else{
            const newDonor = new Donor({
              name,
              dob: new Date(dob),
              phone,
              gender,
              weight,
              bloodtype,
            });
            newDonor
              .save()
              .then((donor) => {
                res.status(200).json({
                  message: "Donor added successfully",
                });
              })
              .catch((error) => {
                res.status(500).json({
                  error: error.message,
                });
              });
          }
        });
      });

const Recipient = mongoose.model('Recipient', productSchema);

app.post("/recipient", function(req, res) {
  const {
    name,
    phone,
    gender,
    bloodtype,
    hospitals,
    dob,
    phoneemergency,
    bloodreason,
  } = req.body;
  Recipient.findOne(
    { name, phone, bloodtype, hospitals },
    function(err, recipient) {
      if (err) {
        return res
          .status(500)
          .send("Error Finding the recipient in the database");
      }
      if (recipient) {
        return res
          .status(400)
          .send("Data already available with the same information");
      } else {
        const newRecipient = new Recipient({
          name,
          phone,
          gender,
          bloodtype,
          hospitals,
          dob: new Date(dob),
          phoneemergency,
          bloodreason,
        });
        newRecipient
          .save()
          .then((recipient) => {
            res.status(200).json({
              message: "Recipient added successfully",
            });
          })
          .catch((error) => {
            res.status(500).json({
              error: error.message,
            });
          });
      }
    }
  );
});


app.get("/secrets",function(req,res){
  res.render("secrets");
})

app.get("/", function(req, res) {
  res.render("home");

});


app.get("/auth/google",
  passport.authenticate('google', {
    scope: ["email"]
  })
);


app.get("/auth/google/secrets",
  passport.authenticate('google', {
    failureRedirect: "/login"
  }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect("/secrets");
  });

app.get("/login", function(req, res) {
  res.render("login");

});

app.get("/findEmail", function(req, res) {
  res.render("findEmail");
})


app.get("/register", function(req, res) {
  res.render("register");

});




app.get("/donor", function(req, res) {
  try {
    res.render("donor");
  } catch (error) {
    console.error(error);
    res.send("An error occurred.");
  }
});

app.get("/recipient", function(req, res) {
  try {
    res.render("recipient");
  } catch (error) {
    console.error(error);
    res.send("An error occurred.");
  }
});


app.get("/submit", function(req, res) {
  if (req.isAuthenticated()) {
    res.render("submit");

  } else {
    res.render("/login");

  }
});


app.post("/submit", function(req, res) {
  const submittedSecret = req.body.secret;
  // console.log(req.user.id);

  LoginDetails.findById(req.user.id, function(err, foundUser) {
    if (err) {
      console.log(err);
    } else {
      if (foundUser) {
        foundUser.secret = submittedSecret;
        foundUser.save(function() {
          res.redirect("/secrets");
          // console.log("submiittedd the secrets!");
        });
      }
    }
  });

});


app.get("/logout", function(req, res) {
  req.logout(function(err) {
    if (err) {
      console.log(err);
    } else {
      res.redirect("/");

    }
  });
});



app.post("/register", function(req, res) {
  LoginDetails.register({
    name: req.body.name,
    username: req.body.username
  }, req.body.password, function(err, user) {
    if (err) {
      console.log(err);
      console.log("show error!");
      res.redirect("/register");
    } else {
      passport.authenticate("local")(req, res, function() {
        res.redirect("/secrets");
        console.log("authenticated!!");
      });
    }
  });
});





app.post("/login", function(req, res) {
  const user = new LoginDetails({
    username: req.body.username,
    password: req.body.Password
  });
  req.login(user, function(err) {
    if (err) {
      console.log(err);
    } else {
      passport.authenticate("local")(req, res, function() {
        res.redirect("/secrets");
        console.log("authenticated!!");

      });
    }
  });
});




app.post('/findEmail', (req, res) => {
  const username = req.body.username;
  LoginDetails.findOne({
    username: username
  }, (err, user) => {

    if (err) {
      return res.status(500).send({
        error: 'Error occurred while checking email'
      });
    }
    if (!user) {
      return res.status(404).send({
        error: 'Email not found'
      });
    }
    // email exists, generate password reset token
    const resetToken = generateResetToken();
    // save reset token to database
    user.resetToken = resetToken;
    user.resetTokenExpiration = Date.now() + 3600000; // 1 hour
    user.save((err) => {
      if (err) {
        return res.status(500).send({
          error: 'Error occurred while saving reset token'
        });
      }
      // send reset email with link to reset password page
      sendResetEmail(username, resetToken);
      res.send({
        message: 'Password reset email sent'
      });
    });
  });
});


function generateResetToken() {
  return crypto.randomBytes(32).toString('hex');
}

async function sendResetEmail(username, resetToken) {

  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: 'malikumairooo2@gmail.com',
      pass: 'elurafibcatiuqse'
    }
  });

  const resetLink = "http://localhost:3000/reset-password/" + resetToken;


  const mailOptions = {
    from: 'malikumairooo2@gmail.com',
    to: username,
    subject: 'Password Reset',

    text: "Click the following link to reset your password: " + resetLink

  };
  await transporter.sendMail(mailOptions);
}

app.get('/reset-password/:resetToken', (req, res) => {
  const resetToken = req.params.resetToken;

  // Verify the reset token and fetch the corresponding user from the database
  // ...

  // Render the reset password page and pass the user information to the template
  res.render('reset-password', {
    valueofit: resetToken
  });
});


app.post("/reset-password", function(req, res) {
  const resetToken = req.body.resetToken;
  const newPassword = req.body.newPassword;

  LoginDetails.findOne({
    resetToken: resetToken
  }, (err, user) => {
    if (err) {
      return res.status(500).send('Error occurred while finding user');
    }
    if (!user) {
      return res.status(404).send('User not found');
    }
    if (user.resetTokenExpiration < Date.now()) {
      return res.status(400).send('Token has expired, request a new one');
    }

    user.setPassword(newPassword, (err) => {
      if (err) {
        return res.status(500).send('Error occurred while saving user');
      }
      user.resetToken = null;
      user.resetTokenExpiration = null;
      user.save((err) => {
        if (err) {
          return res.status(500).send('Error occurred while saving user');
        }
        res.send('Password reset successfully');
      });
    });
  });
});


let port = process.env.PORT;
if (port == null || port == "") {
  port = 3000;
}




app.listen(port, function(req, res) {
  console.log("Server has started successfully");
});
