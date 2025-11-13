// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

contract ImageVerify {
    struct ImageMeta {
        bytes32 hash;
        uint256 timestamp;
        string creator;
    }

    mapping(bytes32 => ImageMeta) private images;

    event ImageRegistered(bytes32 indexed hash, string creator, uint256 timestamp);

    function registerImage(bytes32 _hash, string memory _creator) public {
        require(images[_hash].timestamp == 0, "Image already exists");
        images[_hash] = ImageMeta({
            hash: _hash,
            timestamp: block.timestamp,
            creator: _creator
        });
        emit ImageRegistered(_hash, _creator, block.timestamp);
    }

    function verifyImage(bytes32 _hash) public view returns (bool exists, uint256 timestamp, string memory creator) {
        ImageMeta memory img = images[_hash];
        if (img.timestamp != 0) {
            return (true, img.timestamp, img.creator);
        } else {
            return (false, 0, "");
        }
    }
}