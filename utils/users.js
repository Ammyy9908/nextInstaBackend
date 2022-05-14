let users = [];

//join a user to chat

const joinUser = (id, uid) => {
  const newUser = {
    id,
    uid,
  };
  users.push(newUser);
  return newUser;
};

//get the current user

const getCurrentUser = (id) => {
  const user = users.find((user) => user.id === id);
  return user;
};

const userLeave = (id) => {
  const index = users.findIndex((user) => user.id === id);
  if (index !== -1) {
    return users.splice(index, 1)[0];
  }
};

module.exports = {
  joinUser,
  getCurrentUser,
  userLeave,
};
