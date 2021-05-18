const MINT_AMOUNT = 100;
const BET_AMOUNT = 5;
const SALT = web3.utils.toHex('Thank you');
const FAKE_SALT = web3.utils.toHex('Fuck you');

const HAND = {
  None: 0,
  Rock: 1,
  Paper: 2,
  Scissors: 3,
};

const RESULT = {
  Draw: 0,
  Lose: 1,
  Win: 2,
};

const GAME_RESULT = {
  [HAND.Rock]: {
    [HAND.Rock]: RESULT.Draw,
    [HAND.Paper]: RESULT.Lose,
    [HAND.Scissors]: RESULT.Win,
  },
  [HAND.Paper]: {
    [HAND.Paper]: RESULT.Draw,
    [HAND.Scissors]: RESULT.Lose,
    [HAND.Rock]: RESULT.Win,
  },
  [HAND.Scissors]: {
    [HAND.Scissors]: RESULT.Draw,
    [HAND.Rock]: RESULT.Lose,
    [HAND.Paper]: RESULT.Win,
  },
}

const STATUS = {
  Created: 0,
  Joined: 1,
  Decided: 2,
  Tied: 3,
  Paid: 4,
  Canceled: 5,
}

const getHashedHand = (hostHand, salt) => web3.utils.soliditySha3(
  {
    type: 'uint8',
    value: hostHand,
  },
  {
    type: 'bytes32',
    value: salt,
  }
);

const setupGame = async ({
  factory,
  jankenToken,
  gameBank,
  master,
  user,
}) => {
  await jankenToken.mint(user, MINT_AMOUNT, { from: master });
  await jankenToken.approve(gameBank.address, BET_AMOUNT, { from: user });
  await gameBank.depositTokens(factory.address, BET_AMOUNT, { from: user });
};

const createGame = async ({
  factory,
  hostHandHashed,
  host,
}) => {
  const tx = await factory.createGame(BET_AMOUNT, hostHandHashed, { from: host });
  gameId = tx.logs[0].args.gameId.toNumber();
  return gameId;
};

const playGame = async ({ factory, hostHand, guestHand, accounts }) => {
  const host = accounts[1];
  const guest = accounts[2];
  const hostHandHashed = getHashedHand(hostHand, SALT);
  const gameId = await createGame({ factory, hostHandHashed ,host });
  await factory.joinGame(gameId, guestHand, { from: guest });
  await factory.revealHostHand(gameId, hostHand, SALT, { from: host })

  const status = (await factory._games(gameId)).status.toNumber();
  const winner = (await factory._games(gameId)).winner;
  return (status == STATUS.Tied) ? RESULT.Draw : (winner == host ? RESULT.Win : RESULT.Lose);
};

module.exports = {
  MINT_AMOUNT,
  BET_AMOUNT,
  SALT,
  FAKE_SALT,
  HAND,
  STATUS,
  RESULT,
  GAME_RESULT,
  getHashedHand,
  setupGame,
  createGame,
  playGame,
};
