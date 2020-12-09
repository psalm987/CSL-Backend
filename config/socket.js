let io;

const setSocket = (ioObj) => {
  io = ioObj;
};

const getSocket = () => {
  return io;
};

module.exports = { setSocket, getSocket };
