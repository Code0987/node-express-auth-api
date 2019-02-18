import express from "express";
import compression from "compression";
import session from "express-session";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import lusca from "lusca";
import dotenv from "dotenv";
import mongo from "connect-mongo";
import flash from "express-flash";
import path from "path";
import mongoose from "mongoose";
import expressValidator from "express-validator";
import bluebird from "bluebird";

import { MONGODB_URI, SECRET } from "./util/secrets";

const MongoStore = mongo(session);

// Load environment variables from .env file, where API keys and passwords are configured
dotenv.config({ path: ".env" });

// Create Express server
const app = express();

// Connect to MongoDB
const mongoUrl = MONGODB_URI;
(<any>mongoose).Promise = bluebird;
mongoose.connect(mongoUrl, {useMongoClient: true}).then(
  () => { /** ready to use. The `mongoose.connect()` promise resolves to undefined. */ },
).catch(err => {
  console.log("MongoDB connection error. Please make sure MongoDB is running. " + err);
  // process.exit();
});

// Express configuration
app.set("port", process.env.PORT || 3000);
app.set("views", path.join(__dirname, "../views"));
app.set("view engine", "pug");
app.use(compression());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(expressValidator());
app.use(session({
  resave: true,
  saveUninitialized: true,
  secret: SECRET,
  store: new MongoStore({
    url: mongoUrl,
    autoReconnect: true
  })
}));
app.use(flash());
app.use(lusca.xframe("SAMEORIGIN"));
app.use(lusca.xssProtection(true));

app.use(
  express.static(path.join(__dirname, "public"), { maxAge: 31557600000 })
);

// Api
import { apiRouter } from "./controllers/api";
app.use("/api", apiRouter);

// Home
import { homeRouter } from "./controllers/home";
app.use("/", homeRouter);

export default app;