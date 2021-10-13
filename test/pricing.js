const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Crypto Manga Pricing", () => {
  let CryptoManga, cryptoManga;
  let MockLoot, mockCyberLoot, mockLoot, mockMetaverseTicket;
  let owner,
    addr1,
    addr2,
    multiSigAddress,
    whitelistSignerTierOne,
    whitelistSignerTierTwo;
  let listingPrice, lootDiscountedPrice, whitelistDiscountedPrice;

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

    listingPrice = await cryptoManga.connect(owner).LISTING_PRICE();
    lootDiscountedPrice = await cryptoManga
      .connect(owner)
      .LOOT_DISCOUNTED_PRICE();
  });

  it("should give one discount when user has only one loot token", async () => {
    await cryptoManga.connect(owner).pause(false);
    // Give addr1 some loot tokens.
    await mockLoot.connect(addr1).mint(1);
    expect(await mockLoot.balanceOf(addr1.address)).to.equal(1);

    // Mint 2 cryptoManga tokens with discount for both: fail
    try {
      await cryptoManga.connect(addr1).mint(addr1.address, 2, {
        value: ethers.utils.parseEther("0.14"),
      });
    } catch (err) {
      expect(
        err.message.startsWith("insufficient funds for intrinsic transaction")
      ).to.be.true;
    }

    await cryptoManga
      .connect(addr1)
      .mint(addr1.address, 2, { value: ethers.utils.parseEther("0.15") });
    expect(await cryptoManga.balanceOf(addr1.address)).to.equal(2);
  });

  it("should give a discounted price", async () => {
    await cryptoManga.connect(owner).pause(false);
    // Give addr1 some loot tokens.
    await mockLoot.connect(addr1).mint(1);

    expect(await mockLoot.balanceOf(addr1.address)).to.equal(1);

    //  Mint cryptoManga token with discount: should succeed
    await cryptoManga
      .connect(addr1)
      .mint(addr1.address, 1, { value: ethers.utils.parseEther("0.07") });

    expect(await cryptoManga.balanceOf(addr1.address)).to.equal(1);
  });

  it("should give a discounted price for metaverse and cyberloot", async () => {
    await cryptoManga.connect(owner).pause(false);
    await mockMetaverseTicket.connect(addr1).mint(1);
    await mockCyberLoot.connect(addr1).mint(1);

    expect(await mockCyberLoot.balanceOf(addr1.address)).to.equal(1);
    expect(await mockMetaverseTicket.balanceOf(addr1.address)).to.equal(1);

    await cryptoManga
      .connect(addr1)
      .mint(addr1.address, 2, { value: ethers.utils.parseEther("0.14") });

    expect(await cryptoManga.balanceOf(addr1.address)).to.equal(2);
  });

  it("should not be able to get two discounts with one loot token", async () => {
    await cryptoManga.connect(owner).pause(false);
    // Give addr1 some loot tokens.
    await mockLoot.connect(addr1).mint(1);

    expect(await mockLoot.balanceOf(addr1.address)).to.equal(1);

    // Mint cryptoManga token with discount: should succeed
    await cryptoManga
      .connect(addr1)
      .mint(addr1.address, 1, { value: ethers.utils.parseEther("0.07") });

    expect(await cryptoManga.balanceOf(addr1.address)).to.equal(1);

    // try and mint again with discount, it should fail
    try {
      await cryptoManga
        .connect(addr1)
        .mint(addr1.address, 1, { value: ethers.utils.parseEther("0.07") });
    } catch (err) {
      expect(
        err.message.startsWith("insufficient funds for intrinsic transaction")
      ).to.be.true;
    }

    // mint again with full amount, should succeed

    await cryptoManga
      .connect(addr1)
      .mint(addr1.address, 1, { value: ethers.utils.parseEther("0.08") });

    expect(await cryptoManga.balanceOf(addr1.address)).to.equal(2);
  });

  it("should be able to get two discounts with two loot tokens", async () => {
    await cryptoManga.connect(owner).pause(false);
    // Give addr1 some loot tokens.
    await mockLoot.connect(addr1).mint(2);

    expect(await mockLoot.balanceOf(addr1.address)).to.equal(2);

    await cryptoManga
      .connect(addr1)
      .mint(addr1.address, 1, { value: ethers.utils.parseEther("0.07") });

    expect(await cryptoManga.balanceOf(addr1.address)).to.equal(1);

    await cryptoManga
      .connect(addr1)
      .mint(addr1.address, 1, { value: ethers.utils.parseEther("0.07") });

    expect(await cryptoManga.balanceOf(addr1.address)).to.equal(2);
  });

  it("should get discounts equal to numLootTokens when requesting a higher count", async () => {
    await cryptoManga.connect(owner).pause(false);
    // Give addr1 some loot tokens.
    await mockLoot.connect(addr1).mint(3);

    expect(await mockLoot.balanceOf(addr1.address)).to.equal(3);

    await cryptoManga
      .connect(addr1)
      .mint(addr1.address, 4, { value: ethers.utils.parseEther("0.29") });

    expect(await cryptoManga.balanceOf(addr1.address)).to.equal(4);
  });

  it("should be able to buy 5 tokens correctly when 3 are discounted", async () => {
    await cryptoManga.connect(owner).pause(false);
    await mockLoot.connect(addr1).mint(3);

    await cryptoManga
      .connect(addr1)
      .mint(addr1.address, 5, { value: ethers.utils.parseEther("0.37") });

    expect(await cryptoManga.balanceOf(addr1.address)).to.equal(5);
  });

  it("should avail discount when buying with multiple transactions", async () => {
    await cryptoManga.connect(owner).pause(false);
    await mockLoot.connect(addr1).mint(6);

    await cryptoManga
      .connect(addr1)
      .mint(addr1.address, 3, { value: ethers.utils.parseEther("0.21") });

    expect(await cryptoManga.balanceOf(addr1.address)).to.equal(3);

    await cryptoManga
      .connect(addr1)
      .mint(addr1.address, 4, { value: ethers.utils.parseEther("0.29") });

    expect(await cryptoManga.balanceOf(addr1.address)).to.equal(7);
  });
});
