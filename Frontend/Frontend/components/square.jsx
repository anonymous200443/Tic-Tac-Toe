import React from "react";

const Square = ({ value, onClick, isWinning, winner }) => {
  return (
    <button
      className={`square ${isWinning ? (winner ? "winning-x" : "") : ""}`}
      onClick={onClick}
      disabled={value !== null} // Prevents clicking on filled squares
    >
      {value}
    </button>
  );
};

export default Square;
