//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";

contract Age is Ownable {
    // is 0 at start !
    uint256 private age;

    function getAge() public view returns (uint256) {
        return age;
    }

    function setAge(uint256 _age) public onlyOwner {
        age = _age;
    }
}
