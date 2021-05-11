// SPDX-License-Identifier: UNLICENSED

pragma solidity 0.6.8;

import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";
import "openzeppelin-solidity/contracts/access/AccessControl.sol";

contract JankenToken is ERC20, AccessControl {
    bytes32 private constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    constructor() public ERC20("JankenToken", "JKT") {
        _setupRole(ADMIN_ROLE, msg.sender);
    }

    function mint(address _account, uint256 _amount) external {
        require(hasRole(ADMIN_ROLE, msg.sender), "Caller is not a admin");
        _mint(_account, _amount);
    }

    function burn(address _account, uint256 _amount) external {
        require(hasRole(ADMIN_ROLE, msg.sender), "Caller is not a admin");
        _burn(_account, _amount);
    }
}
