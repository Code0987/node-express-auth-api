import { Router, Request, Response, NextFunction } from "express";

export const homeRouter = Router();

homeRouter.get("/", (req: Request, res: Response) => {
  res.render("home", {
    title: "Home"
  });
});
