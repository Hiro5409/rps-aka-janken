// SPDX-License-Identifier: UNLICENSED

pragma solidity 0.6.8;

import "./GameBank.sol";
import "./IGameBank.sol";

contract GameFactory {
    IGameBank private _gameBank;
    uint256 public constant _minBetAmount = 5;

    constructor(address gameBankAddress) public {
        _gameBank = IGameBank(gameBankAddress);
    }

    modifier isSufficientMinimumBetAmount(uint256 betAmount) {
        require(betAmount >= _minBetAmount, "requried minimum bet amount");
        _;
    }

    function createGame(uint256 betAmount, bytes32 hostHandHashed)
        public
        isSufficientMinimumBetAmount(betAmount)
    {}
}
