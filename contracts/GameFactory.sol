// SPDX-License-Identifier: UNLICENSED

pragma solidity 0.6.8;

import "./Game.sol";
import "./GameBank.sol";

contract GameFactory {
    address[] private _games;
    address public gameBankAddress;

    uint256 public constant minBetAmount = 5;

    event GameCreated(address indexed game, address indexed host);

    modifier isUserDepositedSufficientToken(
        address _gameBankAddress,
        uint256 _amount
    ) {
        GameBank gameBank = GameBank(_gameBankAddress);
        require(
            gameBank.isUserDepositedSufficientToken(msg.sender, _amount),
            "Insufficient token deposited in GameBank"
        );
        _;
    }

    modifier isSufficientMinimumBetAmount(uint256 _betAmount) {
        require(_betAmount >= minBetAmount, "requried minimum bet amount");
        _;
    }

    constructor(address _gameBankAddress) public {
        gameBankAddress = _gameBankAddress;
    }

    function createGame(uint256 _betAmount, bytes32 _hostHandHashed)
        public
        isSufficientMinimumBetAmount(_betAmount)
        isUserDepositedSufficientToken(gameBankAddress, _betAmount)
    {
        Game game =
            new Game(msg.sender, _betAmount, _hostHandHashed, gameBankAddress);
        _games.push(address(game));
        emit GameCreated(address(game), msg.sender);
    }

    function games() public view returns (address[] memory collection) {
        collection = new address[](_games.length);
        for (uint256 i = 0; i < _games.length; i++) {
            collection[i] = _games[i];
        }
        return collection;
    }
}
