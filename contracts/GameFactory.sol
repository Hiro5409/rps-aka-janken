// SPDX-License-Identifier: UNLICENSED

pragma solidity 0.6.8;

import "./GameBank.sol";
import "./IGameBank.sol";

contract GameFactory {
    IGameBank private _gameBank;
    uint256 private constant _minBetAmount = 5;
    uint256 private constant _timeoutSeconds = 216000;

    constructor(address gameBankAddress) public {
        _gameBank = IGameBank(gameBankAddress);
    }

    modifier isSufficientMinimumBetAmount(uint256 betAmount) {
        require(betAmount >= _minBetAmount, "requried minimum bet amount");
        _;
    }

    modifier isDepositedTokens(uint256 _amount) {
        require(
            _gameBank.isDepositedTokens(msg.sender, _amount),
            "Insufficient tokens deposited in GameBank"
        );
        _;
    }

    function createGame(uint256 betAmount, bytes32 hostHandHashed)
        public
        isSufficientMinimumBetAmount(betAmount)
        isDepositedTokens(betAmount)
    {}
}
