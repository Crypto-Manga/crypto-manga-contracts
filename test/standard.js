const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Crypto Manga Standard Functionality", () => {
  let CryptoManga, cryptoManga;
  let MockLoot, mockCyberLoot, mockLoot, mockMetaverseTicket;
  let owner,
    addr1,
    addr2,
    multiSigAddress,
    whitelistSignerTierOne,
    whitelistSignerTierTwo;
  const ipfsBaseURI = "ipfs://xyz/";

  beforeEach(async () => {
    CryptoManga = await ethers.getContractFactory("CryptoManga");
    MockLoot = await ethers.getContractFactory("MockLoot");

    [
      owner,
      addr1,
      addr2,
      multiSigAddress,
      whitelistSignerTierOne,
      whitelistSignerTierTwo,
    ] = await ethers.getSigners();

    mockLoot = await MockLoot.deploy(ipfsBaseURI);
    mockCyberLoot = await MockLoot.deploy(ipfsBaseURI);
    mockMetaverseTicket = await MockLoot.deploy(ipfsBaseURI);

    cryptoManga = await CryptoManga.deploy(
      ipfsBaseURI,
      mockCyberLoot.address,
      mockLoot.address,
      mockMetaverseTicket.address,
      multiSigAddress.address,
      whitelistSignerTierOne.address,
      whitelistSignerTierTwo.address
    );
  });

  it("should be able to mint 1 new token", async () => {
    await cryptoManga.connect(owner).pause(false);
    await cryptoManga
      .connect(addr1)
      .mint(addr1.address, 1, { value: ethers.utils.parseEther("0.08") });

    expect(await cryptoManga.balanceOf(addr1.address)).to.equal(1);
    expect(await cryptoManga.balanceOf(addr2.address)).to.equal(0);
  });

  it("should be able to mint multiple new tokens", async () => {
    await cryptoManga.connect(owner).pause(false);

    await cryptoManga
      .connect(addr1)
      .mint(addr1.address, 2, { value: ethers.utils.parseEther("0.16") });

    expect(await cryptoManga.balanceOf(addr1.address)).to.equal(2);
    expect(await cryptoManga.balanceOf(addr2.address)).to.equal(0);
  });

  it("should be able to retrieve token URI", async () => {
    await cryptoManga.connect(owner).pause(false);
    await cryptoManga
      .connect(addr1)
      .mint(addr1.address, 1, { value: ethers.utils.parseEther("0.08") });

    expect(await cryptoManga.tokenURI(1)).to.equal(`${ipfsBaseURI}1.json`);
  });

  it("should be able to retrieve token URI with multiple minted tokens", async () => {
    await cryptoManga.connect(owner).pause(false);
    await cryptoManga
      .connect(addr1)
      .mint(addr1.address, 2, { value: ethers.utils.parseEther("0.16") });

    expect(await cryptoManga.tokenURI(1)).to.equal(`${ipfsBaseURI}1.json`);
    expect(await cryptoManga.tokenURI(2)).to.equal(`${ipfsBaseURI}2.json`);
  });

  it("should allow owner to give away reserved tokens", async () => {
    await cryptoManga.connect(owner).pause(false);
    await cryptoManga.connect(owner).giveAway(addr1.address, 2);

    expect(await cryptoManga.tokenURI(1)).to.equal(`${ipfsBaseURI}1.json`);

    expect(await cryptoManga.tokenURI(2)).to.equal(`${ipfsBaseURI}2.json`);

    expect(await cryptoManga.balanceOf(addr1.address)).to.equal(2);
  });

  it("should throw when non-owner tries to give away tokens", async () => {
    await cryptoManga.connect(owner).pause(false);
    try {
      await cryptoManga.connect(addr1).giveAway(addr1.address, 1);
    } catch (err) {
      expect(err.message).to.equal(
        "VM Exception while processing transaction: reverted with reason string 'Ownable: caller is not the owner'"
      );
    }
  });

  it("should throw when msg.value is lower than mint price", async () => {
    await cryptoManga.connect(owner).pause(false);
    try {
      await cryptoManga
        .connect(addr1)
        .mint(addr1.address, 2, { value: ethers.utils.parseEther("0.15") });
    } catch (err) {
      expect(
        err.message.startsWith("insufficient funds for intrinsic transaction")
      ).to.be.true;
    }
  });

  it("should throw when user tries to mint when sale is paused", async () => {
    try {
      await cryptoManga
        .connect(addr1)
        .mint(addr1.address, 1, { value: ethers.utils.parseEther("0.08") });
    } catch (err) {
      expect(err.message).to.equal(
        "VM Exception while processing transaction: reverted with reason string 'Pausable: paused'"
      );
    }
  });

  it("should be able to modify base URI before freezing contract", async () => {
    await cryptoManga.connect(owner).pause(false);
    let newURI = "ipfs://abc/";
    expect(await cryptoManga.connect(owner).baseTokenURI()).to.equal(
      ipfsBaseURI
    );
    await cryptoManga.connect(owner).setBaseURI(newURI);
    expect(await cryptoManga.connect(owner).baseTokenURI()).to.equal(newURI);
  });

  it("should not be able to modify base URI after freezing contract", async () => {
    await cryptoManga.connect(owner).pause(false);

    let newURI = "ipfs://abc/";
    expect(await cryptoManga.connect(owner).baseTokenURI()).to.equal(
      ipfsBaseURI
    );
    await cryptoManga.connect(owner).freeze();
    try {
      await cryptoManga.connect(owner).setBaseURI(newURI);
    } catch (err) {
      expect(err.message).to.equal(
        "VM Exception while processing transaction: reverted with reason string 'Contract is frozen'"
      );
    }
  });
  // it("Test fund withdrawal", async () => {
  //   await cryptoManga.connect(owner).pause(false);
  //   await cryptoManga
  //     .connect(addr1)
  //     .mint(addr1.address, 2, { value: ethers.utils.parseEther("0.1") });

  //   await cryptoManga.connect(owner).withdrawAll();
  //   provider = ethers.getDefaultProvider();

  //   const balance = await provider.getBalance(multiSigAddress.address);

  //   console.log(balance.toString());
  // });
});
