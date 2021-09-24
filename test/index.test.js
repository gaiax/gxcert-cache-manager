const rpcHost = "https://matic-mumbai.chainstacklabs.com";
const contractAddress = "0x38c009E363f7AcAEf5a29674192EF5edBe8cFE3f";

const fs = require("fs");
const privateKey = fs.readFileSync(__dirname + "/../.privkey", "utf8").trim();
const assert = require("assert");

const {
  GxCertCacheManager,
  REFRESH_DEPTH,
} = require("../index");
const GxCertClient = require("gxcert-lib");
const GxCertWriter = require("gxcert-write");
const Web3 = require("web3");
const web3 = new Web3(rpcHost);

const Common = require("ethereumjs-common").default;
const common = Common.forCustomChain(
    "mainnet",
    {
          name: "customchain",
          chainId: 80001,
        },
    "petersburg"
);

web3.eth.accounts.privateKeyToAccount(privateKey);

const alice = web3.eth.accounts.create();
const bob = web3.eth.accounts.create();
const charlie = {
    address: "0x4e3911c111bBEb8d254708Fb556e4A09C475A87E",
    privateKey,
};
const writer = new GxCertWriter(web3, contractAddress, privateKey, common);
const client = new GxCertClient(web3, contractAddress);


let validProfile = {
  name: "alice",
  email: "alice@example.com",
  icon: "QmYRBkuxi46tLdFrALkAm1qYztBfNQGKRsQK5UsT9dEMaW",
}

let validGroup = {
  name: "group1",
  residence: "residence",
  phone: "phone",
  member: alice.address,
}
let validCert = {
  context: {},
  title: "title",
  description: "description",
  image: "QmYBSzzk3shgGcos5SnTDaJRh3ZvV8rnwSbGPmsrnWDjVH",
  groupId: null,
}
console.log(validCert);
let validUserCert = {
  certId: null,
  from: alice.address,
  to: bob.address,
}

let groupId;
let certId;
let userCertId;

function nullFunc() {};

describe("GxCertCacheManager", () => {
  it ("init", async function() {
    await writer.init();
    await client.init();
  });
  describe("getProfile", () => {
    it ("create profile", async function() {
      const signedProfile = await client.signProfile(validProfile, { privateKey: alice.privateKey });
      await writer.createProfile(charlie.address, alice.address, signedProfile);
    });
    it ("without image", async function() {
      const manager = new GxCertCacheManager([client]);
      const profile = await manager.getProfile(alice.address, nullFunc, REFRESH_DEPTH.NO_REFRESH, []);
      assert.equal(profile.name, validProfile.name);
      assert.equal(profile.email, validProfile.email);
      assert.equal(profile.icon, validProfile.icon);
    });
    it ("with image", async function() {
      const manager = new GxCertCacheManager([client]);
      const profile = await manager.getProfile(alice.address, nullFunc, REFRESH_DEPTH.SHALLOW, ["profileImage"]);
      assert.equal(profile.name, validProfile.name);
      assert.equal(profile.email, validProfile.email);
      assert.equal(profile.icon, validProfile.icon);
      assert.equal(profile.imageUrl, "");
    });
    it ("cache", async function() {
      const manager = new GxCertCacheManager([client]);
      const profile = await manager.getProfile(alice.address, nullFunc, REFRESH_DEPTH.NO_REFRESH, ["profileImage"]);
      const newProfile = {
        name: "newName",
        email: "new@example.com",
        icon: validProfile.icon,
      }
      const signedProfile = await client.signProfileForUpdating(newProfile, { privateKey: alice.privateKey });
      await writer.updateProfile(charlie.address, signedProfile);
      let _profile = await manager.getProfile(alice.address, nullFunc, REFRESH_DEPTH.NO_REFRESH, []);
      assert.equal(_profile.name, profile.name);
      assert.equal(_profile.email, profile.email);
      assert.equal(_profile.icon, profile.icon);
      assert.equal(_profile.imageUrl, profile.imageUrl);

      _profile = await manager.getProfile(alice.address, nullFunc, REFRESH_DEPTH.SHALLOW, ["profileImage"]);

      assert.equal(_profile.name, newProfile.name);
      assert.equal(_profile.email, newProfile.email);
      assert.equal(_profile.icon, newProfile.icon);
      assert.equal(_profile.imageUrl, "");
      validProfile = _profile;
    });
  });
  describe("getGroups", () => {
      const manager = new GxCertCacheManager([client]);
    let newGroup;
    it ("create group", async function() {
      await writer.createGroup(charlie.address, validGroup);      
    });
    it ("get", async function() {
      const groups = await manager.getGroups(alice.address, nullFunc, REFRESH_DEPTH.NO_REFRESH);
      assert.equal(groups.length, 1);
      const group = groups[0];
      assert.equal(group.name, validGroup.name);
      assert.equal(group.residence, validGroup.residence);
      assert.equal(group.phone, validGroup.phone);
      assert.equal(group.members.length, 1);
      assert.equal(group.members[0].name, validProfile.name);
      assert.equal(group.members[0].address, alice.address);
      assert.equal(group.members[0].icon, validProfile.icon);
      groupId = group.groupId;
      validCert.groupId = groupId;
    });
    it ("update group", async function() {
      newGroup = {
        groupId,
        name: "newGroup",
        residence: "newResidence",
        phone: "newPhone",
      };
      const signedGroup = await client.signGroup(newGroup, { privateKey: alice.privateKey });
      await writer.updateGroup(charlie.address, signedGroup);
    });
    it ("don't refresh(getGroups)", async function() {
      const groups = await manager.getGroups(alice.address, nullFunc, REFRESH_DEPTH.NO_REFRESH);

      assert.equal(groups.length, 1);

      const group = groups[0];
      assert.equal(group.name, validGroup.name);
      assert.equal(group.residence, validGroup.residence);
      assert.equal(group.phone, validGroup.phone);
      assert.equal(group.members.length, 1);
      assert.equal(group.members[0].name, validProfile.name);
      assert.equal(group.members[0].address, alice.address);
      assert.equal(group.members[0].icon, validProfile.icon);

      validGroup = newGroup;
    });
    it ("refresh", async function() {
      const groups = await manager.getGroups(alice.address, nullFunc, REFRESH_DEPTH.SHALLOW);

      assert.equal(groups.length, 1);
      const group = groups[0];
      assert.equal(group.name, validGroup.name);
      assert.equal(group.residence, validGroup.residence);
      assert.equal(group.phone, validGroup.phone);
      assert.equal(group.members.length, 1);
      assert.equal(group.members[0].name, validProfile.name);
      assert.equal(group.members[0].address, alice.address);
      assert.equal(group.members[0].icon, validProfile.icon);
    });
    it ("getGroup (no refresh)", async function() {
      const group = await manager.getGroup(groupId, nullFunc, REFRESH_DEPTH.NO_REFRESH);
      assert.equal(group.name, validGroup.name);
      assert.equal(group.residence, validGroup.residence);
      assert.equal(group.phone, validGroup.phone);
      assert.equal(group.members.length, 1);
      assert.equal(group.members[0].name, validProfile.name);
      assert.equal(group.members[0].address, alice.address);
      assert.equal(group.members[0].icon, validProfile.icon);
    });
  });
  describe("get user certs", () => {
      const manager = new GxCertCacheManager([client]);
    it ("create cert", async function() {
      const signedCert = await client.signCertificate(validCert, { privateKey: alice.privateKey });
      await writer.createCert(charlie.address, signedCert);
      const certs = await client.getGroupCerts(groupId);
      assert.equal(certs.length, 1);
      certId = certs[0].certId;
      validUserCert.certId = certId;
    });
    it ("create", async function() {
      const signedUserCert = await client.signUserCertificate(validUserCert, { privateKey: alice.privateKey });
      await writer.createUserCert(charlie.address, signedUserCert);
    });

    it ("get issued user certs", async function() {
      const userCerts = await manager.getIssuedUserCerts(certId, nullFunc, REFRESH_DEPTH.SHALLOW, []);
      assert.equal(userCerts.length, 1);

      const userCert = userCerts[0];
      assert.equal(userCert.certId, validUserCert.certId);
      assert.equal(userCert.from, validUserCert.from);
      assert.equal(userCert.to, validUserCert.to);
      assert.equal(userCert.certificate, undefined);

      userCertId = userCert.userCertId;
    });
    it ("get issued user certs with certificate", async function() {
      const userCerts = await manager.getIssuedUserCerts(certId, nullFunc, REFRESH_DEPTH.SHALLOW, ["certificate"]);
      assert.equal(userCerts.length, 1);

      const userCert = userCerts[0];
      assert.equal(userCert.certId, validUserCert.certId);
      assert.equal(userCert.from, validUserCert.from);
      assert.equal(userCert.to, validUserCert.to);
      assert.equal(userCert.certificate.certId, validUserCert.certId);
      assert.equal(userCert.certificate.title, validCert.title);
      assert.equal(userCert.certificate.description, validCert.description);
      assert.equal(userCert.certificate.image, validCert.image);
      assert.equal(userCert.certificate.imageUrl, undefined);
    });
    it ("get issued user certs with certificate image", async function() {
      const userCerts = await manager.getIssuedUserCerts(certId, nullFunc, REFRESH_DEPTH.SHALLOW, ["certificate", "certificateImage"]);
      assert.equal(userCerts.length, 1);

      const userCert = userCerts[0];
      assert.equal(userCert.certId, validUserCert.certId);
      assert.equal(userCert.from, validUserCert.from);
      assert.equal(userCert.to, validUserCert.to);
      assert.equal(userCert.certificate.certId, validUserCert.certId);
      assert.equal(userCert.certificate.title, validCert.title);
      assert.equal(userCert.certificate.description, validCert.description);
      assert.equal(userCert.certificate.image, validCert.image);
      assert.equal(userCert.certificate.imageUrl, "");
    });
    it ("get issued user certs(no refresh)", async function() {
      const userCerts = await manager.getIssuedUserCerts(certId, nullFunc, REFRESH_DEPTH.NO_REFRESH, ["certificate", "certificateImage"]);
      assert.equal(userCerts.length, 1);

      const userCert = userCerts[0];
      assert.equal(userCert.certId, validUserCert.certId);
      assert.equal(userCert.from, validUserCert.from);
      assert.equal(userCert.to, validUserCert.to);
      assert.equal(userCert.certificate.certId, validUserCert.certId);
      assert.equal(userCert.certificate.title, validCert.title);
      assert.equal(userCert.certificate.description, validCert.description);
      assert.equal(userCert.certificate.image, validCert.image);
      assert.equal(userCert.certificate.imageUrl, "");
    });
    it ("get received user certs", async function() {
      const userCerts = await manager.getReceivedUserCerts(bob.address, nullFunc, REFRESH_DEPTH.SHALLOW, []);
      assert.equal(userCerts.length, 1);

      const userCert = userCerts[0];
      assert.equal(userCert.certId, validUserCert.certId);
      assert.equal(userCert.from, validUserCert.from);
      assert.equal(userCert.to, validUserCert.to);
      assert.equal(userCert.certificate, undefined);
    });
    it ("get received user certs with certificate", async function() {
      const userCerts = await manager.getReceivedUserCerts(bob.address, nullFunc, REFRESH_DEPTH.SHALLOW, ["certificate"]);
      assert.equal(userCerts.length, 1);

      const userCert = userCerts[0];
      assert.equal(userCert.certId, validUserCert.certId);
      assert.equal(userCert.from, validUserCert.from);
      assert.equal(userCert.to, validUserCert.to);
      assert.equal(userCert.certificate.title, validCert.title);
      assert.equal(userCert.certificate.description, validCert.description);
      assert.equal(userCert.certificate.image, validCert.image);
      assert.equal(userCert.certificate.imageUrl, "");
    });
    it ("get received user certs with certificate image", async function() {
      const userCerts = await manager.getReceivedUserCerts(bob.address, nullFunc, REFRESH_DEPTH.SHALLOW, ["certificate", "certificateImage"]);
      assert.equal(userCerts.length, 1);

      const userCert = userCerts[0];
      assert.equal(userCert.certId, validUserCert.certId);
      assert.equal(userCert.from, validUserCert.from);
      assert.equal(userCert.to, validUserCert.to);
      assert.equal(userCert.certificate.title, validCert.title);
      assert.equal(userCert.certificate.description, validCert.description);
      assert.equal(userCert.certificate.image, validCert.image);
      assert.equal(userCert.certificate.imageUrl, "");
    });
    it ("get received user certs(no refresh)", async function() {
      const userCerts = await manager.getReceivedUserCerts(bob.address, nullFunc, REFRESH_DEPTH.NO_REFRESH, ["certificate", "certificateImage"]);
      assert.equal(userCerts.length, 1);

      const userCert = userCerts[0];
      assert.equal(userCert.certId, validUserCert.certId);
      assert.equal(userCert.from, validUserCert.from);
      assert.equal(userCert.to, validUserCert.to);
      assert.equal(userCert.certificate.certId, validUserCert.certId);
      assert.equal(userCert.certificate.title, validCert.title);
      assert.equal(userCert.certificate.description, validCert.description);
      assert.equal(userCert.certificate.image, validCert.image);
      assert.equal(userCert.certificate.imageUrl, "");
    });
    it ("get user cert(no refresh)", async function () {
      const userCert = await manager.getUserCert(userCertId, nullFunc, REFRESH_DEPTH.NO_REFRESH, ["certificate", "certificateImage"]);
      console.log(userCert);
      assert.equal(userCert.certId, validUserCert.certId);
      assert.equal(userCert.from, validUserCert.from);
      assert.equal(userCert.to, validUserCert.to);
      assert.equal(userCert.certificate.certId, validUserCert.certId);
      assert.equal(userCert.certificate.title, validCert.title);
      assert.equal(userCert.certificate.description, validCert.description);
      assert.equal(userCert.certificate.image, validCert.image);
      assert.equal(userCert.certificate.imageUrl, "");
    });
  });
});
