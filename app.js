const express = require("express");
const path = require("path");
const session = require("express-session");
const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const mongoose = require("mongoose");
const User = require('./models/user')
const Message = require('./models/message')
const bcrypt = require('bcryptjs')
const {body, validationResult} = require('express-validator')
require('dotenv').config()
// const Schema = mongoose.Schema;
// console.log(process.env)

const mongoDb = process.env.MONGO_URL;
mongoose.connect(mongoDb);
const db = mongoose.connection;
db.on("error", console.error.bind(console, "mongo connection error"));


const app = express();
app.set("views", __dirname);
app.set("view engine", "pug");

passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await User.findOne({ username: username });
        if (!user) {
          return done(null, false, { message: "Incorrect username" });
        };
        const match = await bcrypt.compare(password, user.password);
if (!match) {
  // passwords do not match!
  return done(null, false, { message: "Incorrect password" })
}
        return done(null, user);
      } catch(err) {
        return done(err);
      };
    })
  );

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });
  
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findById(id);
      done(null, user);
    } catch(err) {
      done(err);
    };
  });

app.use(session({ secret: process.env.EXPRESS_SECRET, resave: false, saveUninitialized: true }));
app.use(passport.initialize());
app.use(passport.session());
app.use(express.urlencoded({ extended: false }));
app.use((req, res, next) => {
    res.locals.currentUser = req.user;
    next();
  });

app.get("/", async(req, res) => {

    const users = await User.aggregate([{
        $lookup: {
            from: 'messages',
            localField: '_id',
            foreignField: 'user',
            as: 'messages'
        }
    }]).exec()

    const allMessages = await Message.find({}).exec()

    // console.log(users)
    
    // console.log(thing.filter(user => user.messages.length > 0)[0].messages)


    res.render("index",  {user: req.user, users, messages: allMessages})


});

app.get('/delete/:id', async(req, res) => {

  // console.log('in here')
  
  const message = await Message.findById(req.params.id).exec()

  console.log(message)
  
  res.render('delete-message', {title: 'delete message', message})
})

app.post('/delete/:id', async(req, res) => {
  console.log('deleting message')

  await Message.findByIdAndDelete(req.body.messageid)
  res.redirect('/')

})

app.get('/sign-up', (req, res) => res.render('sign-up-form'))

app.get("/log-out", (req, res, next) => {
    req.logout((err) => {
      if (err) {
        return next(err);
      }
      res.redirect("/");
    });
  });

app.get('/join-the-club', (req, res) => {
    
    res.render('join-the-club')})


app.get('/create-message', (req, res) => {
    res.render('create-message')
})

app.post('/create-message', async(req, res) => {
    //add message to database
    console.log(res.locals.currentUser)
    const message = new Message({
        user: res.locals.currentUser._id,
        title: req.body.title,
        text: req.body.message,


    })

    await message.save()
    res.redirect('/')


})

app.post('/join-the-club', async(req, res, next) => {
    if(req.body.clubhousePassword === process.env.CLUBHOUSE_PASSWORD){
        console.log('success')
        console.log(res.locals.currentUser)
        const user = new User({
            _id: res.locals.currentUser._id,
            first_name: res.locals.currentUser.first_name,
            last_name: res.locals.currentUser.last_name,
            username: res.locals.currentUser.username,
            password: res.locals.currentUser.password,

            membership: true
        })

        await User.findByIdAndUpdate(res.locals.currentUser._id, user)
        res.redirect('/')
    } else {
        console.log('failure')
        next()
    }
})

app.post("/sign-up", [
    
    body('first_name', 'invalid first name')
        .trim()
        .isLength({min:1})
        .withMessage('first name empty')
        .isAlpha()
        .withMessage('name must be alphabet letters'),

    body('last_name', 'invalid last name')
        .trim()
        .isLength({min:1})
        .withMessage('last name empty')
        .isAlpha()
        .withMessage('name must be alphabet letters'),

    body('password').isLength({min: 1}),
    body('confirm_password').custom((value, {req}) => {
        return value === req.body.password
    }),
    (req, res, next) => {
        next()
    },
    
    async (req, res, next) => {

    const errors = validationResult(req)

    let admin = false

    if(req.body.admin === 'on'){
      admin = true
    }

    if(!errors.isEmpty()){
        res.render('sign-up-form')
        return
    }

    bcrypt.hash(req.body.password, 10, async (err, hashedPassword) => {
        // if err, do something
        if(err){
            return next(err)
        } else {
            const user = new User({
                username: req.body.username,
                password: hashedPassword,
                first_name: req.body.first_name,
                last_name: req.body.last_name,
                membership: false,
                admin
              });
              const result = await user.save();
              res.redirect("/");
        }
        // otherwise, store hashedPassword in DB
      });
    
  }]);

  app.post(
    "/log-in",
    passport.authenticate("local", {
      successRedirect: "/",
      failureRedirect: "/"
    })
  );

  const port = process.env.PORT || 3000

  app.listen(port, () => console.log(`app listening on port ${port}`));