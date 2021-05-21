require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require('express-session');
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');
const path = require("path");
const logger = require("morgan");
const cookieParser = require("cookie-parser");

const indexRouter = require("./routes/index");
const usersRouter = require("./routes/users");
const createError = require("http-errors");
//----------------------//
// Stripe //

//------------------//
// -------------Subscribe--------------- //
const encrypt = require("mongoose-encryption");
const request = require("request");
const https = require("https");
//----------------------//

const app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));

app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
  extended: true
}));


app.set('view engine', 'ejs');


app.use(session({
  secret: process.env.SECRETS,
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 24 } // 24 hour
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://localhost:27017/momodb", {useNewUrlParser: true, useUnifiedTopology: true});
mongoose.set("useCreateIndex", true);

const userSchema = new mongoose.Schema ({
  email: String,
  password: String,
  googleId: String,
  name: String,
  line1: String,
  city: String,
  state: String,
  postal_code: Number,
  ph_num: Number
});


userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = new mongoose.model("User", userSchema);
passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENTID,
    clientSecret: process.env.CLIENTSECRET,
    callbackURL: "https://pacific-crag-24588.herokuapp.com/auth/google/order1",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile);

    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

app.get("/auth/google",
  passport.authenticate('google', { scope: ["profile"] })
);

app.get("/auth/google/order1",
  passport.authenticate('google', { failureRedirect: "/login" }),
  function(req, res) {
    // Successful authentication, redirect to secrets.
    res.redirect("/order1");
  });


app.get("/", function(req, res){
  res.render("main");
});
app.get("/menu", function(req, res){
  res.render("menu");
});
app.get("/main1", function(req, res){
    if (req.isAuthenticated()){
  res.render("main1");
} else {
  res.redirect("/login");
}
});
app.get("/menu1", function(req, res){
    if (req.isAuthenticated()){
  res.render("menu1");
} else {
  res.redirect("/login");
}
});
app.get("/order", function(req, res){
  res.render("order");
});
app.get("/success", function(req, res){
  res.render("success");
});
app.get("/failure", function(req, res){
  res.render("failure");
});
app.get("/cart1", function(req, res){
    if (req.isAuthenticated()){
  res.render("cart1");
} else {
  res.redirect("/login");
}
});
const fs = require('fs');
const products = JSON.parse(fs.readFileSync('./data/products.json', 'utf8'));

const Cart = require('./models/cart');

app.get("/myorder", function(req, res){
    if (req.isAuthenticated()){
User.findById(req.user.id, function(err, foundUsers){
  if (!req.session.cart) {
    return res.render('myorder', {
      products: null
    });
} else {
      if (foundUsers) {
    const datetime = new Date();
  const cart = new Cart(req.session.cart);
  console.log("CART: "+ JSON.stringify(cart.getItems()))
  res.render("myorder",{
    products: cart.getItems(),
    totalPrice: cart.totalPrice,
    date: datetime.toDateString(),
    usersWithSecrets: foundUsers,
  });
  }
  }
});
} else {
  res.redirect("/login");
}
});

app.get("/about", function(req, res){
  res.render("about");
});
app.get("/about1", function(req, res){
    if (req.isAuthenticated()){
  res.render("about1");
} else {
  res.redirect("/login");
}
});
app.get("/address1", function(req, res){
  if (req.isAuthenticated()){
  User.findById(req.user.id, function(err, foundUsers){
    if (err){
      console.log(err);
    } else {
      if (foundUsers) {
        res.render("address1", {usersWithSecrets: foundUsers});
      }
    }
  });
} else {
  res.redirect("/login");
}
});

app.get("/submit", function(req, res){
  if (req.isAuthenticated()){
    res.render("submit");
  } else {
    res.redirect("/login");
  }
});

app.post("/submit", function(req, res){
  const street = req.body.line1;
const city1 = req.body.city;
const state1 = req.body.state;
const postal_code1 = req.body.postal_code;
const ph_num1 = req.body.ph_num;

  User.findById(req.user.id, function(err, foundUser){
    if (err) {
      console.log(err);
    } else {
      if (foundUser) {
        foundUser.line1 = street;
        foundUser.city = city1;
        foundUser.state = state1;
        foundUser.postal_code = postal_code1;
        foundUser.ph_num = ph_num1;
        foundUser.save(function(){
          res.redirect("/address1");
        });
      }
    }
  });
});

app.get("/choose", function(req, res){
    if (req.isAuthenticated()){
  res.render("choose");
} else {
  res.redirect("/login");
}
});

app.get("/ty", function(req, res){
    if (req.isAuthenticated()){
  const cart = new Cart(req.session.cart);
  console.log("CART: "+ JSON.stringify(cart.getItems()))
  res.render("ty",{  products: cart.getItems() });
} else {
  res.redirect("/login");
}
});

app.get("/catering", function(req, res){
  res.render("catering",{ msg:""});
});
app.get("/location", function(req, res){
  res.render("location");
});
app.get("/catering1", function(req, res){
    if (req.isAuthenticated()){
  res.render("catering1",{ msg:""});
} else {
  res.redirect("/login");
}
});
app.get("/location1", function(req, res){
    if (req.isAuthenticated()){
  res.render("location1");
} else {
  res.redirect("/login");
}
});
// Display page to ask the user for their phone number
app.get("/login", function(req, res){
  res.render("login");
});
app.get("/register", function(req, res){
  res.render("register");
});


app.get("/logout", function(req, res){
  req.logout();
  res.redirect("/");
});
app.post("/register", function(req, res){

  User.register({username: req.body.username}, req.body.password, function(err, user){
    if (err) {
      res.redirect("/register");
    } else {
      passport.authenticate("local")(req, res, function(){
        res.redirect("/order1");
      });
    }
  });

});

app.post("/login", function(req, res){

  const user = new User({
    username: req.body.username,
    password: req.body.password
  });

  req.login(user, function(err){
    if (err) {
    } else {
      passport.authenticate("local")(req, res, function(){
        res.redirect("/order1");
      });
    }
  });

});




//Subscribe //
app.post("/s", function(req, res){

  const email = req.body.email;

  const data ={
  members: [
    {
      email_address: email,
      status: "subscribed",
    }
  ]
};
const jsonData = JSON.stringify(data);
const url = "https://us2.api.mailchimp.com/3.0/lists/process.env.APIKEY";
const options = {
  method: "POST",
  auth: process.env.AUTH
}

const request = https.request(url, options, function(response){

  if (response.statusCode === 200) {
    res.render("success");
  }else {
  res.render("failure");
  }

  response.on("data", function(data){
    console.log(JSON.parse(data));
  })
})

request.write(jsonData);
request.end();
});


// Stripe//
const Publishable_Key = process.env.PUBLISHABLEKEY;
const Secret_Key = process.env.SECRETKEY;

const stripe = require('stripe')(Secret_Key);

app.get('/checkout', function(req, res){
  const cart = new Cart(req.session.cart);
  console.log("CART: "+ JSON.stringify(cart.getItems()))
  res.render('checkout', {
	key: Publishable_Key,
  products: cart.getItems(),
  totalPrice: cart.totalPrice,
  name: req.body.name
});
});

app.post('/payment', function(req, res){


    const cart = new Cart(req.session.cart);
    console.log("CART: "+ JSON.stringify(cart.getItems()))
    const totalPrice = cart.totalPrice * 100;

    User.find({"postal_code": {$ne: null}}, function(err, foundUsers){
      if (err){
        console.log(err);
      } else {
        if (foundUsers) {
	stripe.customers.create({
		email: req.body.stripeEmail,
		source: req.body.stripeToken,
		name: req.body.name,
		address: {
      line1: foundUsers.line1,
			postal_code: foundUsers.postal_code,
			city: foundUsers.city,
			state: foundUsers.state,
			country: 'India',
		}
	}).then((customer) => {

		return stripe.charges.create({
			amount: totalPrice,
			description:  `Momo's Order ID : ${JSON.stringify(cart.getItems())} `,
			currency: 'INR',
			customer: customer.id
		});
	}).then((charge) => {
		res.render("ty",{  products: cart.getItems() }); // If no error occurs
	})
	.catch((err) => {
		res.send(err)	 // If some error occurs
	});
}
}
});
});





//------------------------------- Form---------------  //
const nodemailer = require("nodemailer");

// custom middleware to log data access
const log = function (request, response, next) {
	console.log(`${new Date()}: ${request.protocol}://${request.get('host')}${request.originalUrl}`);
	console.log(request.body); // make sure JSON middleware is loaded first
	next();
}
app.use(log);
// end custom middleware


// HTTP POST
app.post("/send", (req, res) => {
   const output = `
   <p> You have a new contact request</p>
   <h3>Contact Details</h3>
   <ul>
   <li> Name: ${req.body.name}</li>
   <li> Email: ${req.body.email}</li>
   <li> Phone Number: ${req.body.number}</li>
   </ul
   ><h3>Message</h3>
   <p>${req.body.message}</p>
   `;

  let transporter = nodemailer.createTransport({
    host: process.env.HOSTEMAILID,
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.USEREMAILID, // generated ethereal user
      pass: process.env.PASS, // generated ethereal password
    },
    tls:{
      rejectUnauthorized:false
    }
  });

  // send mail with defined transport object
  let mailOptions = {
    from: '"Nodemailer Contact" <process.env.USEREMAILID>', // sender address
    to: process.env.USEREMAILID, // list of receivers
    subject: "Hello ✔", // Subject line
    text: "Hello world?", // plain text body
    html: output, // html body

  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error){
      return console.log(error);
    }
    console.log("Message sent: %s", info.messageId);
    console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
    res.render("catering",{msg:"Message Sent !"});
  });
});

app.post("/sendd", (req, res) => {
   const output = `
   <p> You have a new contact request</p>
   <h3>Contact Details</h3>
   <ul>
   <li> Name: ${req.body.name}</li>
   <li> Email: ${req.body.email}</li>
   <li> Phone Number: ${req.body.number}</li>
   </ul
   ><h3>Message</h3>
   <p>${req.body.message}</p>
   `;

  let transporter = nodemailer.createTransport({
    host: process.env.HOSTEMAILID,
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.USEREMAILID, // generated ethereal user
      pass: process.env.PASS, // generated ethereal password
    },
    tls:{
      rejectUnauthorized:false
    }
  });

  // send mail with defined transport object
  let mailOptions = {
    from: '"Nodemailer Contact" <process.env.USEREMAILID>', // sender address
    to: process.env.USEREMAILID, // list of receivers
    subject: "Hello ✔", // Subject line
    text: "Hello world?", // plain text body
    html: output, // html body

  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error){
      return console.log(error);
    }
    console.log("Message sent: %s", info.messageId);
    console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
    res.render("catering1",{msg:"Message Sent !"});
  });
});


  // Global midleware
  app.use(function(req, res, next) {
    res.locals.session = req.session;
    next();
  });



app.get("/order1", function(req, res){
  res.render("order1",{
    products: products
  });
});

app.get("/cart", function(req, res){
    if (!req.session.cart) {
      return res.render('cart', {
        products: null
      });
      } else {
    const cart = new Cart(req.session.cart);
    res.render('cart', {
      products: cart.getItems(),
      totalPrice: cart.totalPrice
    });
  }
});


app.get('/add/:id', function(req, res, next) {
  const productId = req.params.id;
  const cart = new Cart(req.session.cart ? req.session.cart : {});
  const product = products.filter(function(item) {
    return item.id == productId;
  });
  cart.add(product[0], productId);
  req.session.cart = cart;
  res.redirect('/order1');
});

app.get('/remove/:id', function(req, res, next) {
  const productId = req.params.id;
  const cart = new Cart(req.session.cart ? req.session.cart : {});

  cart.remove(productId);
  req.session.cart = cart;
  res.redirect('/cart');
});


let port = process.env.PORT;
if (port == null || port == "") {
  port = 3000;
}

app.listen(port, function() {
  console.log("Server started on port Successfully !");
});

module.exports = app;
