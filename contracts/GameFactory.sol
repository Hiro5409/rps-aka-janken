// SPDX-License-Identifier: UNLICENSED

pragma solidity 0.6.8;

import "./GameBank.sol";
import "./IGameBank.sol";

contract GameFactory {
    IGameBank private _gameBank;

    constructor(address gameBankAddress) public {
        _gameBank = IGameBank(gameBankAddress);
    }
}
