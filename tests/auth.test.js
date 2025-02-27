const mongoose = require("mongoose");
const request = require("supertest");
const { MongoMemoryServer } = require("mongodb-memory-server");
const app = require("../server.js");
const User = require("../models/User.js");
const bcrypt = require("bcrypt");

let mongoServer, server;

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();

    await mongoose.disconnect();
    await mongoose.connect(uri);

    server = app.listen(4000);
});

beforeEach(async () => {
    await mongoose.connection.db.dropDatabase();
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
    server.close();
});

describe("Authentication Tests", () => {
    describe("User Registration", () => {
        it("should register a new user", async () => {
            const res = await request(server).post("/api/register").send({
                username: "testuser",
                email: "test@example.com",
                password: "Password123"
            });
            console.log("Response:", res.body); // Debugging
            expect(res.statusCode).toBe(201);
        });

        it("should reject duplicate email registration", async () => {
            await User.create({
                username: "existing",
                email: "exists@example.com",
                password: "Password123"
            });

            const res = await request(server).post("/api/register").send({
                username: "newuser",
                email: "exists@example.com",
                password: "Password123"
            });
            expect(res.statusCode).toBe(400);
        });

        it("should validate required fields", async () => {
            const res = await request(server).post("/api/register").send({
                email: "invalid@example.com",
                password: "password"
            });
            expect(res.statusCode).toBe(400);
        });

        it("should validate email format", async () => {
            const res = await request(server).post("/api/register").send({
                username: "bademail",
                email: "invalid-email",
                password: "Password123"
            });
            expect(res.statusCode).toBe(400);
        });

        it("should enforce password complexity", async () => {
            const res = await request(server).post("/api/register").send({
                username: "weakpass",
                email: "weak@example.com",
                password: "123"
            });
            expect(res.statusCode).toBe(400);
        });
    });

    describe("User Login", () => {
        beforeEach(async () => {
            const hashedPassword = await bcrypt.hash("Password123", 10);
            await User.create({
                username: "loginuser",
                email: "login@example.com",
                password: hashedPassword
            });
        });


        it("should login with valid credentials", async () => {
            const res = await request(server).post("/api/login").send({
                emailOrUsername: "login@example.com",
                password: "Password123"
            });


            console.log("Login Response:", res.body);
            expect(res.statusCode).toBe(200);
        });

        it("should reject invalid email", async () => {
            const res = await request(server).post("/api/login").send({
                emailOrUsername: "wrong@example.com",
                password: "Password123"
            });
            expect(res.statusCode).toBe(401);
        });

        it("should reject incorrect password", async () => {
            const res = await request(server).post("/api/login").send({
                emailOrUsername: "login@example.com",
                password: "WrongPassword!"
            });
            expect(res.statusCode).toBe(401);
        });
    });
});

describe("Referral System Tests", () => {
    let referrer, validCode;

    beforeEach(async () => {
        referrer = await User.create({
            username: "newuser1",
            email: "new1@example.com",
            password: "Password123"
        });
    });


describe("Registration with Referral", () => {
    it("should apply valid referral code during registration", async () => {
        const res = await request(server)
            .post(`/api/register?referral=${referrer.username}`) // ✅ Pass referral in query
            .send({
                username: "newuser",
                email: "new@example.com",
                password: "Password123"
            });

        console.log("Response body:", res.body);
        expect(res.statusCode).toBe(201);

        const updatedReferrer = await User.findById(referrer._id);
        expect(updatedReferrer.successfulReferrals).toBe(1);
    });

    it("should reject invalid referral code", async () => {
        const res = await request(server).post(`/api/register?referral=${referrer.username}1`).send({
            username: "newuser",
            email: "new@example.com",
            password: "Password123",
        });
        expect(res.statusCode).toBe(400);
    });

    it("should reject expired referral code", async () => {
        await User.findByIdAndUpdate(referrer._id, {
            referralCodeExpires: Date.now() - 3600000
        });

        const res = await request(server).post("/api/register").send({
            username: "newuser",
            email: "new@example.com",
            password: "Password123!",
            referralCode: validCode
        });
        expect(res.statusCode).toBe(400);
    });

    it("should prevent self-referral during registration", async () => {
        const selfUser = "selfrefer";

        // Register the user
        const res = await request(server).post("/api/register").send({
            username: selfUser,
            email: "self@example.com",
            password: "Password123",
        });

        console.log("Response Status:", res.statusCode);
        console.log("Response Body:", res.body);

        expect(res.statusCode).toBe(201);

        // Try registering another account using the same username as a referral code (self-referral)
        const selfReferralRes = await request(server)
            .post("/api/register")
            .query({ referral: selfUser }) // Passing referral as query param
            .send({
                username: "another",
                email: "another@example.com",
                password: "Password123!",
            });

        expect(selfReferralRes.statusCode).toBe(400);
    });
});

});