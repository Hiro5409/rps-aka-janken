// SPDX-License-Identifier: UNLICENSED

pragma solidity 0.6.8;

import "./IGameFactory.sol";
import "./GameBank.sol";
import "./IGameBank.sol";
import "./JankenGame.sol";
import "./GameStatus.sol";

contract GameFactory is IGameFactory, JankenGame, GameStatus {
    IGameBank private _gameBank;
    uint256 private constant _minBetAmount = 5;
    uint256 private constant _timeoutSeconds = 216000;
    Game[] public _games;

    event GameCreated(uint256 indexed gameId, address indexed host);
    event GameJoined(
        uint256 indexed gameId,
        address indexed guest,
        Hand guestHand
    );
    event GameRevealed(Hand hostHand);
    event GameJudged(address indexed winner, address indexed loser);

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

    modifier isNotGameHost(address hostAddress) {
        require(
            msg.sender != hostAddress,
            "host of this game is not authorized"
        );
        _;
    }

    modifier isGameHost(address hostAddress) {
        require(
            msg.sender == hostAddress,
            "host of this game is only authorized"
        );
        _;
    }

    modifier isValidHand(
        Hand hostHand,
        bytes32 salt,
        bytes32 previousHostHandHashed
    ) {
        bytes32 currentHostHandHashed =
            keccak256(abi.encodePacked(hostHand, salt));
        require(
            currentHostHandHashed == previousHostHandHashed,
            "cannot change hand or salt later out"
        );
        _;
    }

    function isGameDecided(uint256 gameId) external view returns (bool) {
        Game memory game = _games[gameId];
        return game.status == Status.Decided;
    }

    function isGameTied(uint256 gameId) external view returns (bool) {
        Game memory game = _games[gameId];
        return game.status == Status.Tied;
    }

    function isGameWinner(uint256 gameId, address me)
        external
        view
        returns (bool)
    {
        Game memory game = _games[gameId];
        return game.winner == me;
    }

    function createGame(uint256 betAmount, bytes32 hostHandHashed)
        external
        isSufficientMinimumBetAmount(betAmount)
        isDepositedTokens(betAmount)
    {
        uint256 gameId = _games.length;
        Game memory newGame;
        newGame.id = gameId;
        newGame.betAmount = betAmount;
        newGame.timeoutSeconds = _timeoutSeconds;
        newGame.hostAddress = msg.sender;
        newGame.hostHandHashed = hostHandHashed;
        newGame.status = Status.Created;
        _games.push(newGame);

        emit GameCreated(gameId, msg.sender);
    }

    function joinGame(uint256 gameId, Hand guestHand)
        external
        isNotGameHost(_games[gameId].hostAddress)
        isDepositedTokens(_games[gameId].betAmount)
        isStatusCreated(_games[gameId].status)
    {
        Game storage game = _games[gameId];
        game.guestAddress = msg.sender;
        game.guestHand = guestHand;
        game.status = Status.Joined;
        emit GameJoined(gameId, msg.sender, guestHand);
    }

    function revealHostHand(
        uint256 gameId,
        Hand hostHand,
        bytes32 salt
    )
        external
        isGameHost(_games[gameId].hostAddress)
        isStatusJoined(_games[gameId].status)
        isValidHand(hostHand, salt, _games[gameId].hostHandHashed)
    {
        Game storage game = _games[gameId];
        game.hostHand = hostHand;
        emit GameRevealed(hostHand);
        judge(gameId);
    }

    function judge(uint256 gameId) private {
        Game storage game = _games[gameId];
        (address winner, address loser) =
            playGame(
                game.hostAddress,
                game.hostHand,
                game.guestAddress,
                game.guestHand
            );

        game.status = (winner == loser ? Status.Tied : Status.Decided);
        game.winner = winner;
        game.loser = loser;
        emit GameJudged(winner, loser);
    }

    function getResult(uint256 gameId)
        external
        view
        returns (address loser, uint256 amount)
    {
        Game memory game = _games[gameId];
        return (game.loser, game.betAmount);
    }
}
