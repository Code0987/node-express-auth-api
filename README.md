# node-express-auth-api

A very basic example of token based authentication in Node + Express.
Implemented as part of assignment given by Hope Research Group.

### Setup

```
cd node-express-auth-api
npm install

npm run debug
```

### Screenshots

Api functions are in `src/controllers/api.ts`.

#### Create
POST /api/create
name, email, password
![1](screenshots/create-1.jpg?raw=true "1")

#### Login
POST /api/login
email, login
![2](screenshots/login-1.jpg?raw=true "2")

#### Forgot
POST /api/forgot
email
![3](screenshots/forgot-1.jpg?raw=true "3")

#### Reset
POST /api/reset/:token
password
![4](screenshots/reset-1.jpg?raw=true "4")

#### Me (Login check)
POST /api/me
Header: Authentication = Bearer :token
![5](screenshots/me-1.jpg?raw=true "5")