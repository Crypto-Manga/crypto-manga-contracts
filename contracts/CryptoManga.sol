// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "./ILoot.sol";

contract CryptoManga is ERC721URIStorage, Ownable, Pausable {
  using SafeMath for uint256;

  using Counters for Counters.Counter;
  Counters.Counter private _tokenIdTracker; // init: 0

  uint256 public constant MAX_TOKENS = 5555;
  uint256 public constant MAX_MINT = 20;

  // give aways
  uint256 public constant RESERVED_TOKENS = 239;
  uint256 private _reserved;

  uint256 public constant LISTING_PRICE = 0.08 ether;
  uint256 public constant LOOT_DISCOUNTED_PRICE = 0.07 ether;
  uint256 public constant WHITELIST_TIER_ONE_DISCOUNTED_PRICE = 0.065 ether;
  uint256 public constant WHITELIST_TIER_TWO_DISCOUNTED_PRICE = 0.07 ether;

  string public baseTokenURI;

  bool public frozen;

  mapping(address => uint256) lootDiscountsRedeemed;
  mapping(address => bool) whitelistedDiscount;

  address public multiSigOwner;
  address public whitelistSignerTierOne;
  address public whitelistSignerTierTwo;

  ILoot cyberLootContract;
  ILoot sevensContract;
  ILoot metaverseTicket;

  event CryptoMangaSpawn(uint256 indexed id);

  constructor(
    string memory baseURI,
    address _cyberLoot,
    address _metaverseTicket,
    address _sevens,
    address _multiSigOwner,
    address _whitelistSignerTierOne,
    address _whitelistSignerTierTwo
  ) ERC721("CryptoManga", "CMA") {
    setBaseURI(baseURI);
    _reserved = RESERVED_TOKENS;
    cyberLootContract = ILoot(_cyberLoot);
    sevensContract = ILoot(_sevens);
    metaverseTicket = ILoot(_metaverseTicket);
    multiSigOwner = _multiSigOwner;
    whitelistSignerTierOne = _whitelistSignerTierOne;
    whitelistSignerTierTwo = _whitelistSignerTierTwo;
    pause(true);
  }

  function _baseURI() internal view virtual override returns (string memory) {
    return baseTokenURI;
  }

  function setBaseURI(string memory baseURI) public onlyOwner {
    require(!frozen, "Contract is frozen");
    baseTokenURI = baseURI;
  }

  function freeze() public onlyOwner {
    frozen = true;
  }

  function _totalSupply() internal view returns (uint256) {
    return _tokenIdTracker.current();
  }

  modifier saleIsOpen() {
    require(_totalSupply() <= MAX_TOKENS, "Sale ended");
    if (_msgSender() != owner()) {
      require(!paused(), "Pausable: paused");
    }
    _;
  }

  function mint(address _to, uint256 _count) external payable saleIsOpen {
    require(_count > 0, "Mint count should be greater than zero");
    require(_count <= MAX_MINT, "Exceeds max items");
    uint256 numTokens = _totalSupply();
    require(numTokens <= MAX_TOKENS, "Sale ended");
    require(numTokens + _count <= MAX_TOKENS, "Max limit");

    require(msg.value >= price(_to, _count), "Insufficient funds");

    if (isEligibleForDiscount(_to)) {
      uint256 numEligibleDiscounts = calculateNumDiscounts(_to);
      if (numEligibleDiscounts >= _count) {
        lootDiscountsRedeemed[_to] += _count;
      } else {
        lootDiscountsRedeemed[_to] += numEligibleDiscounts;
      }
    }

    for (uint256 i = 0; i < _count; i++) {
      _mintOneItem(_to);
    }
  }

  function mintWithTierOneDiscount(
    address _to,
    uint256 _count,
    bytes calldata _signature
  ) external payable saleIsOpen {
    mintWithDiscount(
      _to,
      _count,
      _signature,
      whitelistSignerTierOne,
      WHITELIST_TIER_ONE_DISCOUNTED_PRICE
    );
  }

  function mintWithTierTwoDiscount(
    address _to,
    uint256 _count,
    bytes calldata _signature
  ) external payable saleIsOpen {
    mintWithDiscount(
      _to,
      _count,
      _signature,
      whitelistSignerTierTwo,
      WHITELIST_TIER_TWO_DISCOUNTED_PRICE
    );
  }

  function mintWithDiscount(
    address _to,
    uint256 _count,
    bytes calldata _signature,
    address whitelistSigner,
    uint256 _price
  ) private {
    require(_count > 0, "Mint count should be greater than zero");
    require(_count <= MAX_MINT, "Exceeds max items");
    bytes32 message = prefixed(keccak256(abi.encodePacked(_to, uint256(1))));

    require(
      recoverSigner(message, _signature) == whitelistSigner,
      "Wrong signature"
    );

    require(whitelistedDiscount[_to] == false, "Discount already claimed");
    uint256 numTokens = _totalSupply();
    require(numTokens <= MAX_TOKENS, "Sale ended");
    require(numTokens + _count <= MAX_TOKENS, "Max limit");
    uint256 discountedPrice = _price.mul(_count);
    require(msg.value >= discountedPrice, "Insufficient funds");

    for (uint256 i = 0; i < _count; i++) {
      _mintOneItem(_to);
    }

    whitelistedDiscount[_to] = true;
  }

  function giveAway(address _to, uint256 _count) external onlyOwner {
    uint256 numTokens = _totalSupply();
    require(numTokens <= MAX_TOKENS, "Sale ended");
    require(numTokens + _count <= MAX_TOKENS, "Max limit");
    require(_reserved > 0, "No more reserved tokens available");

    for (uint256 i = 0; i < _count; i++) {
      _mintOneItem(_to);
    }

    _reserved = _reserved.sub(_count);
  }

  function _mintOneItem(address _to) private {
    _tokenIdTracker.increment();
    uint256 tokenId = _totalSupply();

    _safeMint(_to, tokenId);
    _setTokenURI(
      tokenId,
      string(abi.encodePacked(Strings.toString(tokenId), ".json"))
    );
    emit CryptoMangaSpawn(tokenId);
  }

  function setMultiSigOwner(address _multiSignOwner) public onlyOwner {
    multiSigOwner = _multiSignOwner;
  }

  function setWhitelistSignerTierOne(address _whitelistSigner)
    public
    onlyOwner
  {
    whitelistSignerTierOne = _whitelistSigner;
  }

  function setWhitelistSignerTierTwo(address _whitelistSigner)
    public
    onlyOwner
  {
    whitelistSignerTierTwo = _whitelistSigner;
  }

  function pause(bool val) public onlyOwner {
    if (val == true) {
      _pause();
      return;
    }
    _unpause();
  }

  function isEligibleForDiscount(address _to) public view returns (bool) {
    uint256 numLootTokens = cyberLootContract
      .balanceOf(_to)
      .add(sevensContract.balanceOf(_to))
      .add(metaverseTicket.balanceOf(_to));
    uint256 numDiscountsRedeemed = lootDiscountsRedeemed[_to];

    return numDiscountsRedeemed <= numLootTokens;
  }

  function calculateNumDiscounts(address _to) public view returns (uint256) {
    require(isEligibleForDiscount(_to), "Not eligible for discounts");

    uint256 numLootTokens = cyberLootContract
      .balanceOf(_to)
      .add(sevensContract.balanceOf(_to))
      .add(metaverseTicket.balanceOf(_to));
    uint256 numDiscountsRedeemed = lootDiscountsRedeemed[_to];

    return numLootTokens.sub(numDiscountsRedeemed);
  }

  function price(address _to, uint256 _count) public view returns (uint256) {
    if (!isEligibleForDiscount(_to)) {
      return LISTING_PRICE.mul(_count);
    } else {
      uint256 numEligibleDiscounts = calculateNumDiscounts(_to);
      if (numEligibleDiscounts >= _count) {
        return LOOT_DISCOUNTED_PRICE.mul(_count);
      } else {
        uint256 discounted = LOOT_DISCOUNTED_PRICE.mul(numEligibleDiscounts);
        uint256 standard = LISTING_PRICE.mul(_count.sub(numEligibleDiscounts));
        return discounted.add(standard);
      }
    }
  }

  function prefixed(bytes32 hash) internal pure returns (bytes32) {
    return
      keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", hash));
  }

  function recoverSigner(bytes32 message, bytes memory sig)
    internal
    pure
    returns (address)
  {
    uint8 v;
    bytes32 r;
    bytes32 s;

    (v, r, s) = splitSignature(sig);

    return ecrecover(message, v, r, s);
  }

  function splitSignature(bytes memory sig)
    internal
    pure
    returns (
      uint8,
      bytes32,
      bytes32
    )
  {
    require(sig.length == 65);

    bytes32 r;
    bytes32 s;
    uint8 v;

    assembly {
      // first 32 bytes, after the length prefix
      r := mload(add(sig, 32))
      // second 32 bytes
      s := mload(add(sig, 64))
      // final byte (first byte of the next 32 bytes)
      v := byte(0, mload(add(sig, 96)))
    }

    return (v, r, s);
  }

  function withdrawAll() public payable onlyOwner {
    uint256 balance = address(this).balance;
    require(balance > 0);
    _withdraw(multiSigOwner, balance);
  }

  function _withdraw(address _address, uint256 _amount) private {
    (bool success, ) = _address.call{ value: _amount }("");
    require(success, "Transfer failed.");
  }
}
