const rpcHost = "https://matic-mumbai.chainstacklabs.com";
const contractAddress = "0x93A62c0bDF73cB2843453daA55890E5f4Fae2A57";

const fs = require("fs");
const privateKey = fs.readFileSync(__dirname + "/../.privkey", "utf8").trim();
const assert = require("assert");

const { GxCertCacheManager } = require("../index");
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
const client = new GxCertClient(web3, contractAddress, null,
  {
    host: "ipfs.gaiax-blockchain.com",
    port: 5001,
    protocol: "http",
  },
  "http://ipfs.gaiax-blockchain.com:8080/ipfs"
);

let validProfile = {
  name: "alice",
  icon: "QmYRBkuxi46tLdFrALkAm1qYztBfNQGKRsQK5UsT9dEMaW",
};

let bobProfile = {
  name: "bob",
  icon: "QmYRBkuxi46tLdFrALkAm1qYztBfNQGKRsQK5UsT9dEMaW",
};

let validGroup = {
  name: "group1",
  residence: "residence",
  phone: "phone",
};
let validCert = {
  context: {},
  title: "title",
  description: "description",
  image: "QmYBSzzk3shgGcos5SnTDaJRh3ZvV8rnwSbGPmsrnWDjVH",
  groupId: null,
};
let validUserCert = {
  certId: null,
  from: alice.address,
  to: bob.address,
};

let groupId;
let certId;
let userCertId;

const ipfsConfig = {
  host: "ipfs.gaiax-blockchain.com",
  port: 5001,
  protocol: "http",
}

function nullFunc() {}

describe("GxCertCacheManager", () => {
  it("init", async function () {
    await writer.init();
    await client.init();
  });
  describe("getProfile", () => {
    it("create profile", async function () {
      let signedProfile = await client.signProfile(validProfile, {
        privateKey: alice.privateKey,
      });
      await writer.createProfile(charlie.address, alice.address, signedProfile);
      signedProfile = await client.signProfile(bobProfile, {
        privateKey: bob.privateKey,
      });
      await writer.createProfile(charlie.address, bob.address, signedProfile);
    });
    it("without image", async function () {
      const manager = new GxCertCacheManager([client], ipfsConfig);
      const profile = await manager.getProfile(alice.address, nullFunc, [
        {
          type: "profile",
          refresh: false,
        },
      ]);
      assert.equal(profile.name, validProfile.name);
      assert.equal(profile.icon, validProfile.icon);
    });
    it("with image", async function () {
      const manager = new GxCertCacheManager([client], ipfsConfig);
      const profile = await manager.getProfile(alice.address, nullFunc, [
        {
          type: "profile",
          refresh: true,
        },
      ]);
      assert.equal(profile.name, validProfile.name);
      assert.equal(profile.icon, validProfile.icon);
    });
    it("cache", async function () {
      const manager = new GxCertCacheManager([client], ipfsConfig);
      const profile = await manager.getProfile(alice.address, nullFunc, [
        {
          type: "profile",
          refresh: false,
        },
      ]);
      const newProfile = {
        name: "newName",
        icon: validProfile.icon,
      };
      const signedProfile = await client.signProfileForUpdating(newProfile, {
        privateKey: alice.privateKey,
      });
      await writer.updateProfile(charlie.address, signedProfile);
      let _profile = await manager.getProfile(alice.address, nullFunc, [
        {
          type: "profile",
          refresh: false,
        },
      ]);
      assert.equal(_profile.name, profile.name);
      assert.equal(_profile.icon, profile.icon);

      _profile = await manager.getProfile(alice.address, nullFunc, [
        {
          type: "profile",
          refresh: true,
        },
      ]);

      assert.equal(_profile.name, newProfile.name);
      assert.equal(_profile.icon, newProfile.icon);
      validProfile = _profile;
    });
  });
  describe("getGroups", () => {
    const manager = new GxCertCacheManager([client], ipfsConfig);
    let newGroup;
    it("create group", async function () {
      const signedGroup = await client.signGroup(validGroup, alice.address, {
        privateKey: alice.privateKey
      });
      await writer.createGroup(charlie.address, signedGroup);
    });
    it("get", async function () {
      const groups = await manager.getGroups(alice.address, nullFunc, [
        {
          type: "groupId",
          refresh: false,
        },
        {
          type: "group",
          refresh: false,
        },
      ]);
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
    it("update group", async function () {
      newGroup = {
        groupId,
        name: "newGroup",
        residence: "newResidence",
        phone: "newPhone",
      };
      const signedGroup = await client.signGroupForUpdating(newGroup, {
        privateKey: alice.privateKey,
      });
      await writer.updateGroup(charlie.address, signedGroup);
    });
    it("getGroups (no refresh)", async function () {
      manager.setMainClient(null);
      const groups = await manager.getGroups(alice.address, nullFunc, [
        {
          type: "groupId",
          refresh: false,
        },
        {
          type: "group",
          refresh: false,
        },
      ]);

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
      manager.setMainClient(client);
    });
    it("refresh", async function () {
      const groups = await manager.getGroups(alice.address, nullFunc, [
        {
          type: "groupId",
          refresh: true,
        },
        {
          type: "group",
          refresh: true,
        },
      ]);

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
    it("getGroup (no refresh)", async function () {
      manager.setMainClient(null);
      const group = await manager.getGroup(groupId, nullFunc, [
        {
          type: "group",
          refresh: false,
        },
      ]);
      assert.equal(group.name, validGroup.name);
      assert.equal(group.residence, validGroup.residence);
      assert.equal(group.phone, validGroup.phone);
      assert.equal(group.members.length, 1);
      assert.equal(group.members[0].name, validProfile.name);
      assert.equal(group.members[0].address, alice.address);
      assert.equal(group.members[0].icon, validProfile.icon);
      manager.setMainClient(client);
    });
  });
  describe("get user certs", () => {
    const manager = new GxCertCacheManager([client], ipfsConfig);
    it("create cert", async function () {
      const signedCert = await client.signCertificate(validCert, {
        privateKey: alice.privateKey,
      });
      await writer.createCert(charlie.address, signedCert);
      const certs = await client.getGroupCerts(groupId);
      assert.equal(certs.length, 1);
      certId = certs[0].certId;
      validUserCert.certId = certId;
    });
    it("create", async function () {
      const signedUserCert = await client.signUserCertificate(validUserCert, {
        privateKey: alice.privateKey,
      });
      await writer.createUserCert(charlie.address, signedUserCert);
    });

    it("get issued user certs", async function () {
      const userCerts = await manager.getIssuedUserCerts(certId, nullFunc, [
        {
          type: "userCert",
          refresh: true,
        },
      ]);
      assert.equal(userCerts.length, 1);

      const userCert = userCerts[0];
      assert.equal(userCert.certId, validUserCert.certId);
      assert.equal(userCert.from, validUserCert.from);
      assert.equal(userCert.to, validUserCert.to);
      assert.equal(userCert.certificate, undefined);

      userCertId = userCert.userCertId;
    });
    it("get issued user certs with certificate", async function () {
      const userCerts = await manager.getIssuedUserCerts(certId, nullFunc, [
        {
          type: "userCert",
          refresh: true,
        },
        {
          type: "certificate",
          refresh: false,
        },
      ]);
      assert.equal(userCerts.length, 1);

      const userCert = userCerts[0];
      assert.equal(userCert.certId, validUserCert.certId);
      assert.equal(userCert.from, validUserCert.from);
      assert.equal(userCert.to, validUserCert.to);
      assert.equal(userCert.certificate.certId, validUserCert.certId);
      assert.equal(userCert.certificate.title, validCert.title);
      assert.equal(userCert.certificate.description, validCert.description);
      assert.equal(userCert.certificate.image, validCert.image);
    });
    it("get issued user certs with certificate image", async function () {
      const userCerts = await manager.getIssuedUserCerts(certId, nullFunc, [
        {
          type: "userCert",
          refresh: true,
        },
        {
          type: "certificate",
          refresh: false,
        },
      ]);
      assert.equal(userCerts.length, 1);

      const userCert = userCerts[0];
      assert.equal(userCert.certId, validUserCert.certId);
      assert.equal(userCert.from, validUserCert.from);
      assert.equal(userCert.to, validUserCert.to);
      assert.equal(userCert.certificate.certId, validUserCert.certId);
      assert.equal(userCert.certificate.title, validCert.title);
      assert.equal(userCert.certificate.description, validCert.description);
      assert.equal(userCert.certificate.image, validCert.image);
    });
    it("get issued user certs with certificate image and group", async function () {
      const userCerts = await manager.getIssuedUserCerts(certId, nullFunc, [
        {
          type: "userCert",
          refresh: true,
        },
        {
          type: "certificate",
          refresh: false,
        },
        {
          type: "group",
          refresh: false,
        },
      ]);
      assert.equal(userCerts.length, 1);

      const userCert = userCerts[0];
      assert.equal(userCert.certId, validUserCert.certId);
      assert.equal(userCert.from, validUserCert.from);
      assert.equal(userCert.to, validUserCert.to);
      assert.equal(userCert.certificate.certId, validUserCert.certId);
      assert.equal(userCert.certificate.title, validCert.title);
      assert.equal(userCert.certificate.description, validCert.description);
      assert.equal(userCert.certificate.image, validCert.image);
      assert.equal(userCert.certificate.group.name, validGroup.name);
      assert.equal(userCert.certificate.group.residence, validGroup.residence);
      assert.equal(userCert.certificate.group.phone, validGroup.phone);
    });
    it("get issued user certs with certificate image and group and profile", async function () {
      const userCerts = await manager.getIssuedUserCerts(certId, nullFunc, [
        {
          type: "userCert",
          refresh: true,
        },
        {
          type: "certificate",
          refresh: false,
        },
        {
          type: "group",
          refresh: false,
        },
        {
          type: "profile",
          refresh: false,
        },
      ]);
      assert.equal(userCerts.length, 1);

      console.log(userCerts[0]);
      const userCert = userCerts[0];
      assert.equal(userCert.certId, validUserCert.certId);
      assert.equal(userCert.from, validUserCert.from);
      assert.equal(userCert.to, validUserCert.to);
      assert.equal(userCert.certificate.certId, validUserCert.certId);
      assert.equal(userCert.certificate.title, validCert.title);
      assert.equal(userCert.certificate.description, validCert.description);
      assert.equal(userCert.certificate.image, validCert.image);
      assert.equal(userCert.certificate.group.name, validGroup.name);
      assert.equal(userCert.certificate.group.residence, validGroup.residence);
      assert.equal(userCert.certificate.group.phone, validGroup.phone);
      assert.equal(userCert.toProfile.name, bobProfile.name);
      assert.equal(userCert.toProfile.icon, bobProfile.icon);
    });
    it("get issued user certs(no refresh)", async function () {
      manager.setMainClient(null);
      const userCerts = await manager.getIssuedUserCerts(certId, nullFunc, [
        {
          type: "userCert",
          refresh: false,
        },
        {
          type: "certificate",
          refresh: false,
        },
      ]);
      assert.equal(userCerts.length, 1);

      const userCert = userCerts[0];
      assert.equal(userCert.certId, validUserCert.certId);
      assert.equal(userCert.from, validUserCert.from);
      assert.equal(userCert.to, validUserCert.to);
      assert.equal(userCert.certificate.certId, validUserCert.certId);
      assert.equal(userCert.certificate.title, validCert.title);
      assert.equal(userCert.certificate.description, validCert.description);
      assert.equal(userCert.certificate.image, validCert.image);
      manager.setMainClient(client);
    });
    it("get received user certs", async function () {
      const userCerts = await manager.getReceivedUserCerts(
        bob.address,
        nullFunc,
        [
          {
            type: "userCert",
            refresh: true,
          },
        ]
      );
      assert.equal(userCerts.length, 1);

      const userCert = userCerts[0];
      assert.equal(userCert.certId, validUserCert.certId);
      assert.equal(userCert.from, validUserCert.from);
      assert.equal(userCert.to, validUserCert.to);
      assert.equal(userCert.certificate, undefined);
    });
    it("get received user certs with certificate", async function () {
      const userCerts = await manager.getReceivedUserCerts(
        bob.address,
        nullFunc,
        [
          {
            type: "userCert",
            refresh: true,
          },
          {
            type: "certificate",
            refresh: false,
          },
        ]
      );
      assert.equal(userCerts.length, 1);

      const userCert = userCerts[0];
      assert.equal(userCert.certId, validUserCert.certId);
      assert.equal(userCert.from, validUserCert.from);
      assert.equal(userCert.to, validUserCert.to);
      assert.equal(userCert.certificate.title, validCert.title);
      assert.equal(userCert.certificate.description, validCert.description);
      assert.equal(userCert.certificate.image, validCert.image);
    });
    it("get received user certs with certificate image", async function () {
      const userCerts = await manager.getReceivedUserCerts(
        bob.address,
        nullFunc,
        [
          {
            type: "userCert",
            refresh: true,
          },
          {
            type: "certificate",
            refresh: false,
          },
        ]
      );
      assert.equal(userCerts.length, 1);

      const userCert = userCerts[0];
      assert.equal(userCert.certId, validUserCert.certId);
      assert.equal(userCert.from, validUserCert.from);
      assert.equal(userCert.to, validUserCert.to);
      assert.equal(userCert.certificate.title, validCert.title);
      assert.equal(userCert.certificate.description, validCert.description);
      assert.equal(userCert.certificate.image, validCert.image);
    });
    it("get received user certs(no refresh)", async function () {
      manager.setMainClient(null);
      const userCerts = await manager.getReceivedUserCerts(
        bob.address,
        nullFunc,
        [
          {
            type: "userCert",
            refresh: false,
          },
          {
            type: "certificate",
            refresh: false,
          },
        ]
      );
      assert.equal(userCerts.length, 1);

      const userCert = userCerts[0];
      assert.equal(userCert.certId, validUserCert.certId);
      assert.equal(userCert.from, validUserCert.from);
      assert.equal(userCert.to, validUserCert.to);
      assert.equal(userCert.certificate.certId, validUserCert.certId);
      assert.equal(userCert.certificate.title, validCert.title);
      assert.equal(userCert.certificate.description, validCert.description);
      assert.equal(userCert.certificate.image, validCert.image);
      manager.setMainClient(client);
    });
    it("get user cert(no refresh)", async function () {
      manager.setMainClient(null);
      const userCert = await manager.getUserCert(userCertId, nullFunc, [
        {
          type: "userCert",
          refresh: false,
        },
        {
          type: "certificate",
          refresh: false,
        },
        {
          type: "group",
          refresh: false,
        },
        {
          type: "profile",
          refresh: false,
        },
      ]);
      assert.equal(userCert.certId, validUserCert.certId);
      assert.equal(userCert.from, validUserCert.from);
      assert.equal(userCert.to, validUserCert.to);
      assert.equal(userCert.certificate.certId, validUserCert.certId);
      assert.equal(userCert.certificate.title, validCert.title);
      assert.equal(userCert.certificate.description, validCert.description);
      assert.equal(userCert.certificate.image, validCert.image);
      assert.equal(userCert.certificate.group.name, validGroup.name);
      assert.equal(userCert.certificate.group.residence, validGroup.residence);
      assert.equal(userCert.certificate.group.phone, validGroup.phone);
      assert.equal(userCert.toProfile.name, bobProfile.name);
      assert.equal(userCert.toProfile.icon, bobProfile.icon);
      manager.setMainClient(client);
    });
  });
  describe("getGroupCerts", () => {
    const manager = new GxCertCacheManager([client], ipfsConfig);
    it("get", async function () {
      const certs = await manager.getGroupCerts(groupId, nullFunc, [
        {
          type: "certificate",
          refresh: false,
        },
      ]);
      assert.equal(certs.length, 1);
      const cert = certs[0];
      assert.equal(cert.certId, validUserCert.certId);
      assert.equal(cert.title, validCert.title);
      assert.equal(cert.description, validCert.description);
      assert.equal(cert.image, validCert.image);
    });
    it("get (no refresh)", async function () {
      manager.setMainClient(null);
      const certs = await manager.getGroupCerts(groupId, nullFunc, [
        {
          type: "certificate",
          refresh: false,
        },
      ]);
      assert.equal(certs.length, 1);
      const cert = certs[0];
      assert.equal(cert.certId, validUserCert.certId);
      assert.equal(cert.title, validCert.title);
      assert.equal(cert.description, validCert.description);
      assert.equal(cert.image, validCert.image);
      manager.setMainClient(client);
    });
  });
});
