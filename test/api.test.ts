import request from "supertest";
import app from "../src/app";
import User from "../src/models/User";

describe("create and login", () => {
  it("should return 200", (done) => {
    return request(app)
      .post("/api/create")
      .send({
        name: 'Test User',
        email: 'test.user@test.xyz',
        password: 'Test_#123'
      })
      .expect(200)
      .end(function (err, res) {
        if (err) return done(err);
        console.log(JSON.stringify(res.body));
        done();
      });
  });

  it("should return 200", (done) => {
    return request(app)
      .post("/api/login")
      .send({
        email: 'test.user@test.xyz',
        password: 'Test_#123'
      })
      .expect(200)
      .end(function (err, res) {
        if (err) return done(err);
        console.log(JSON.stringify(res.body));
        done();
      });
  });
});

describe("forget and reset", () => {
  it("should return 200", (done) => {
    return request(app)
      .post("/api/forget")
      .send({
        email: 'test.user@test.xyz'
      })
      .expect(200)
      .end(function (err, res) {
        if (err) return done(err);
        console.log(JSON.stringify(res.body));
        done();
      });
  });

  User.findOne({ email: 'test.user@test.xyz' }, (err, user: any) => {
    if (err) { return; }
    if (!user) { return; }

    it("should return 200", (done) => {
      return request(app)
        .post(`/api/reset/${user.passwordResetToken}`)
        .send({
          password: 'Test_#123_2'
        })
        .expect(200)
        .end(function (err, res) {
          if (err) return done(err);
          console.log(JSON.stringify(res.body));
          done();
        });
    });
  });

});
