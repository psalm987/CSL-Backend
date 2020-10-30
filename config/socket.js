let socket;
let io;

const setSocket = (socketObj, ioObj) => {
  socket = socketObj;
  io = ioObj;
};

const getSocket = () => {
  return {
    socket,
    io,
  };
};

module.exports = { setSocket, getSocket };
