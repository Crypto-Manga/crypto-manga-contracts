// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MockLoot is ERC721URIStorage, Ownable {
    string public baseTokenURI;
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIdTracker; // init: 0

    constructor(string memory baseURI) ERC721("MockLoot", "MLT") {
        setBaseURI(baseURI);
    }

    function _totalSupply() internal view returns (uint256) {
        return _tokenIdTracker.current();
    }

    function _baseURI() internal view virtual override returns (string memory) {
        return baseTokenURI;
    }

    function setBaseURI(string memory baseURI) public onlyOwner {
        baseTokenURI = baseURI;
    }

    function mint(uint256 _count) external payable {
        for (uint256 i = 0; i < _count; i++) {
            _tokenIdTracker.increment();
            uint256 tokenId = _totalSupply();
            _safeMint(_msgSender(), tokenId);
            _setTokenURI(
                tokenId,
                string(abi.encodePacked(Strings.toString(tokenId), ".json"))
            );
        }
    }
}
