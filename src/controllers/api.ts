import { Router, Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import async from "async";
import crypto from "crypto";
import nodemailer from "nodemailer";

import { default as User, UserModel, AuthToken } from "../models/User";
import { SECRET, SMTP_URI, prod, SMTP_SENDER } from "../util/secrets";

export function createToken(payload, expiresIn) {
  return jwt.sign(payload, SECRET, { expiresIn });
}

export function verifyToken(req, res, next) {
  let token = req.body.token
    || req.query.token
    || req.headers["x-access-token"]
    || req.headers["authorization"];

  if (token) {
    if (token.startsWith("Bearer ")) {
      token = token.slice(7, token.length);
    }

    jwt.verify(token, SECRET, (err, decoded) => {
      if (err) {
        return res.status(401).json({
          success: false,
          message: "Failed to authenticate token."
        });
      } else {
        req.decoded = decoded;
        next();
      }
    });
  } else {
    return res.status(403).send({
      success: false,
      message: "Token not found."
    });
  }
}

export const apiRouter = Router();

apiRouter.post("/create", async (req: Request, res: Response, next: NextFunction) => {
  try {
    req.assert("name", "Name is not valid").len({ min: 3 });
    req.assert("email", "Email is not valid").isEmail();
    req.assert("password", "Password must be at least 4 characters long").len({ min: 4 });
    req.sanitize("email").normalizeEmail({ gmail_remove_dots: false });

    const errors = req.validationErrors();

    if (errors) {
      return res.status(400).json({
        errors: errors,
      });
    }

    const { name, email, password } = req.body;

    const user = new User({
      name: name,
      email: email,
      password: password
    });

    User.findOne({ email: email }, (err, existingUser) => {
      if (err) { return next(err); }
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: "Account with that email address already exists.",
        });
      }
      user.save((err) => {
        if (err) { return next(err); }
        res.status(200).json({
          success: true,
          message: "Your account is now active. Congratulations!"
        });
      });
    });

  } catch (err) {
    res.status(400).json({
      errors: [
        {
          title: "Registration Error",
          detail: "Something went wrong during registration process.",
          errorMessage: err.message,
        },
      ],
    });
  }
});

apiRouter.post("/login", async (req: Request, res: Response) => {
  try {
    req.assert("email", "Email is not valid").isEmail();
    req.assert("password", "Password must be at least 4 characters long").len({ min: 4 });
    req.sanitize("email").normalizeEmail({ gmail_remove_dots: false });

    const errors = req.validationErrors();

    if (errors) {
      return res.status(400).json({
        errors: errors,
      });
    }

    const { email, password } = req.body;

    const user: any = await User.findOne({ email });
    if (!user) {
      throw new Error("No such user.");
    }

    user.comparePassword(password, (err, isMatch) => {
      if (err) {
        throw "Error.";
      }

      if (!isMatch) {
        res.status(400).json({ success: false, message: "Invalid password." });
      } else {
        const payload = { name: user.name, email: user.email };
        const token = createToken(payload, 7 * 24 * 60 * 60);

        res.status(200).json({
          success: true,
          message: `Welcome! ${user.name}`,
          name: user.name,
          token: token
        });
      }
    });
  } catch (err) {
    res.status(401).json({
      errors: [
        {
          title: "Invalid Credentials",
          detail: "Check email and password combination",
          errorMessage: err.message,
        },
      ],
    });
  }
});

apiRouter.post("/forgot", async (req: Request, res: Response) => {
  try {
    req.assert("email", "Please enter a valid email address.").isEmail();
    req.sanitize("email").normalizeEmail({ gmail_remove_dots: false });

    const errors = req.validationErrors();

    if (errors) {
      return res.status(400).json({
        errors: errors,
      });
    }

    const { email } = req.body;

    async.waterfall([
      function createRandomToken(done: Function) {
        crypto.randomBytes(16, (err, buf) => {
          const token = buf.toString("hex");
          done(err, token);
        });
      },
      function setRandomToken(token: any, done: Function) {
        User.findOne({ email: email }, (err, user: any) => {
          if (err) { return done(err); }
          if (!user) {
            done("Account with that email address does not exist.", token, user);
            return;
          }
          user.passwordResetToken = token;
          user.passwordResetExpires = Date.now() + 3600000; // 1 hour
          user.save((err) => {
            done(err, token, user);
            return;
          });
        });
      },
      function sendForgotPasswordEmail(token: any, user: UserModel, done: Function) {
        const transporter = nodemailer.createTransport(SMTP_URI);
        const mailOptions = {
          to: user.email,
          from: SMTP_SENDER,
          subject: "Reset your password!",
          text: `You are receiving this email because you (or someone else) have requested the reset of the password for your account.\n\n
            Please click on the following link, or paste this into your browser to complete the process:\n\n
            http://${req.headers.host}/api/reset/${token}\n\n
            If you did not request this, please ignore this email and your password will remain unchanged.\n`
        };
        if (!prod) {
          console.log(JSON.stringify(mailOptions));
        }
        if (prod) {
          transporter.sendMail(mailOptions, (err) => {
            done(err, token);
          });
        } else {
          done(undefined, token);
          return;
        }
      },
      function sendResponse(token: any, done: Function) {
        if (prod) {
          res.status(200).json({
            success: true,
            message: `Instructions sent to registered email.`
          });
        } else {
          res.status(200).json({
            success: true,
            message: `Instructions sent to registered email.`,
            debug: !prod,
            token: token
          });
        }
        done();
      }
    ], (err) => {
      if (err) {
        res.status(403).json({
          errors: [err],
        });
      }
    });
  } catch (err) {
    res.status(401).json({
      errors: [
        {
          title: "Woosh!",
          detail: "An error occurred.",
          errorMessage: err.message,
        },
      ],
    });
  }
});

apiRouter.post("/reset/:token", async (req: Request, res: Response, next: NextFunction) => {
  try {
    req.assert("password", "Password must be at least 4 characters long.").len({ min: 4 });

    const errors = req.validationErrors();

    if (errors) {
      return res.status(400).json({
        errors: errors,
      });
    }

    const { password } = req.body;

    async.waterfall([
      function resetPassword(done: Function) {
        User
          .findOne({ passwordResetToken: req.params.token })
          .where("passwordResetExpires").gt(Date.now())
          .exec((err, user: any) => {
            if (err) { return next(err); }
            if (!user) {
              done("Password reset token is invalid or has expired.", user);
              return;
            }
            user.password = password;
            user.passwordResetToken = undefined;
            user.passwordResetExpires = undefined;
            user.save((err) => {
              done(err, user);
            });
          });
      },
      function sendResetPasswordEmail(user: UserModel, done: Function) {
        const transporter = nodemailer.createTransport(SMTP_URI);
        const mailOptions = {
          to: user.email,
          from: SMTP_SENDER,
          subject: "Your password has been changed",
          text: `Hello,\n\nThis is a confirmation that the password for your account ${user.email} has just been changed.\n`
        };
        if (prod) {
          transporter.sendMail(mailOptions, (err) => {
            done(err);
          });
        } else {
          done();
          return;
        }
      },
      function sendResponse(done: Function) {
        res.status(200).json({
          success: true,
          message: `Password reset.`
        });
        done();
      }
    ], (err) => {
      if (err) {
        res.status(403).json({
          errors: [err],
        });
      }
    });
  } catch (err) {
    res.status(401).json({
      errors: [
        {
          title: "Woosh!",
          detail: "An error occurred.",
          errorMessage: err.message,
        },
      ],
    });
  }
});

apiRouter.post("/me", verifyToken, async (req: any, res) => {
  res.status(200).json({
    status: true,
    message: "Welcome! " + JSON.stringify(req.decoded)
  });
});
