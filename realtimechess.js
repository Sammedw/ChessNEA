//Import chess.js module
const { Chess } = require("chess.js");

//Real time chess class
class RealTimeChess {

    constructor() {
        //Composition: create new chess object
        this.chess = new Chess();
        //Create blank dictionary to keep track of cooldowns
        this.cooldownList = {};
        //Set to true when the game is over
        this.gameOver = false;
    }

    //Utility Methods
    getPosition() {
        return this.chess.fen();
    }

    //takes a board string and changes turn to given player, returns new string
    changeTurn(boardString, player) {
        //Change the turn to player making move
        if (player == "w") {
            //use regular expressions to locate part of string containing the turn 
            //and replace with given player's colour
            boardString = boardString.replace(/ [wb] /, " w ");
        } else {
            boardString = boardString.replace(/ [wb] /, " b ");
        }
        return boardString;
    }

    //Cooldown Methods

    //Adds given piece and square to cooldown list
    addPieceCooldown(square, piece) {
        //add sqaure to cooldown with corresponding piece
        this.cooldownList[square] = piece;
        console.log("Current piece cooldowns: " + JSON.stringify(this.cooldownList));
    }

    //removes given piece and square from cooldown list
    removePieceCooldown(square, piece) {
        //check the cooldown exists
        var cooldownPiece = this.queryPieceCooldown(square);
        //Checks that a new piece hasn't taken the sqaure before removing cooldown
        if (cooldownPiece == piece) {
            //remove the cooldown
            delete this.cooldownList[square]
        }
    }

    //returns the piece if a current square is on cooldown else false
    queryPieceCooldown(square) {
        //Check if the square is contained in cooldown list
        if (Object.keys(this.cooldownList).includes(square)) {
            //return the piece on that square
            return this.cooldownList[square];
        } else {
            return false;
        }
    }

    //Called internally to evaluate king moves
    evalKingMove(source, piece, pieceColour, pieceType, target) {
        //Check its a valid king move
        //Create a blank board to test that the king is only moving one square
        var blankBoard = new Chess();
        blankBoard.clear();
        //Place white king on source square
        blankBoard.put({type: "k", color: "w"}, source);
        //Attempt move
        var valid = blankBoard.move({from: source, to: target});
        //If it is a valid move, check that target piece is not one of their own
        if (valid) {
            //Get the piece on target sqaure
            var targetPiece = this.chess.get(target);
            //Check if target sqaure has piece on it
            if (targetPiece) {
                //Check that target is not a piece of same colour
                if (targetPiece.color != pieceColour) {
                    //The piece on valid sqaure has opposite colour
                    //Check that if the piece captured was on cooldown
                    if (this.queryPieceCooldown(target, piece) != false) {
                        //return interrupt if client needs to reset cooldown animation
                        return {legal: true, interrupt: true};
                    } else {
                        return {legal: true, interrupt: false};
                    }

                } else {
                    //The piece on sqaure has same colour
                    return {legal: false};
                }
            } else {
                //No piece on valid square
                return {legal: true, interrupt: false};
            }
        } else {
            //Not a valid sqaure for king
            return {legal: false};
        }
    }

    //Called internally to evaluate normal moves
    evalNormalMove(source, piece, pieceColour, pieceType, target) {
        //Piece is not king
        //Get current chess position
        var currentChessPos = this.chess.fen();
        //Change the turn to player making move
        currentChessPos = this.changeTurn(currentChessPos, pieceColour);

        var currentBoard = new Chess(currentChessPos);
        var valid; //Stores the evaluation of current iteration
        var validMoveFound; //A flag that can be used at end of loop to determine if legal move was found
        var kingSquare = null; //contains the square which the friendly king is on

        //Loop through pieces on board to locate king
        const columns = ["a", "b", "c", "d", "e", "f", "g", "h"];
        columns.forEach(function(column) {
            var row = 1;
            for (row; row <=8; row++) {
                //get piece on current sqaure
                var currentSquare = column + row.toString();
                var currentPiece = currentBoard.get(currentSquare); 
                //check if there is piece on square 
                if (currentPiece != null) {
                    //Check if the currentPiece is king and the same colour
                    if (currentPiece.type == "k" && currentPiece.color == pieceColour) {
                    //save current square as kingSquare
                    kingSquare = currentSquare;
                    break;
                    }
                }  
            }
        });  

        //Check that you are not moving through your own king
        //This must be done as the king is removed from the board to evaluate the move
        if (pieceType.toLowerCase() != "p") {
            //Test for non pawn pieces i.e. those that can move more than one sqaure
            //Create blank board
            var kingTestBoard = new Chess();    
            kingTestBoard.clear();
            //Place king of same colour on board
            kingTestBoard.put({type: "k", color:pieceColour}, kingSquare);
            //place piece that is trying to move on board
            kingTestBoard.put({type: pieceType.toLowerCase(), color: pieceColour}, source);
            //Change turn to current player
            kingTestBoard.load(this.changeTurn(kingTestBoard.fen(), pieceColour));
            //test the move, checking that the piece is not moving through the king
            valid = kingTestBoard.move({from: source, to: target, promotion:"q"});
            if (valid) {
            } else {
                return {legal: false};
            } 
        //As pawns can only move one sqaure, check that the target square does not contain friendly king
        } else if (target == kingSquare){
            return {legal: false};
        }

        //Check king exists
        if (kingSquare != null) {
            //Remove king to evaulate the move
            currentBoard.remove(kingSquare);
        }

        //If king not found, it must be in flight
    
        
        //Loop over blank pieces to find safe square - must use seperate loop as king must be removed
        //before placing another king to test for safe squares
        columns.forEach(function(column) {
            var row = 1;
            for (row; row <=8; row++) {
                //get piece on current sqaure
                var currentSquare = column + row.toString();
                var currentPiece = currentBoard.get(currentSquare);
                //check if there is piece on square 
                if (!(currentPiece != null)) {
                    //Place king on square
                    currentBoard.put({type: "k", color: pieceColour}, currentSquare);
                    //Check if king is in check
                    if (!(currentBoard.in_check())) {
                        //Check if move is valid
                        valid = currentBoard.move({from: source, to: target, promotion: "q"});
                        //If valid break
                        if (valid) {
                            validMoveFound = true;
                            break;
                        }
                    }

                    //Remove king to try again next iteration
                    currentBoard.remove(currentSquare);
                }
            }
        }); 

        //Check if valid move was found
        //If there was no sqaure the king could be where the move was legal it is safe to assume its illegal
        if (validMoveFound == true) {
            var returnObject = {legal: true};

            //check if a pawn promotion move was made
            if (pieceType.toLowerCase() == "p") {
                //get row which pawn is moving into
                var row = target.charAt(1);
                //check if the pawn has reached end of the board
                if ((pieceColour == "w" && row == "8") || (pieceColour == "b" && row == "1")) {
                    //Add flag to return object p for promotion
                    returnObject.special = "p";
                    //Create new board with same position
                    var specialPosition = new Chess(this.getPosition());
                    //Place a queen on promotion square
                    specialPosition.put({type: "q", color: pieceColour}, target);
                    //remove pawn from original square
                    specialPosition.remove(source);
                    //attach new board position to the return object
                    returnObject.specialPosition = specialPosition.fen();
                }
            }
            //Check that if the piece captured was on cooldown
            if (this.queryPieceCooldown(target, piece) != false) {
                //attach a flag to return object if a cooldon was interrupted
                returnObject.interrupt = true
            } else {
                returnObject.interrupt = false
            }

            //return the result of all of the processing
            return returnObject;

        } else {
            //The move is illegal
            return {legal: false};
        }      
    }


    //Returns an object containing true if the move was legal and other important flags
    evalMove(source, piece, target) {
        //try catches any unforseen errors preventing whole website crash
        try {
            //get piece type and colour that was moved
            var pieceColour = piece.charAt(0);
            var pieceType = piece.charAt(1);

            //Perform checks before evaluating move

            //Firstly, check if the game is still in play
            if (this.gameOver == true) {
                return {legal: false};
            }

            //Check if the piece is on cooldown
            if (this.queryPieceCooldown(source) != false) {
                return {legal: false};
            }

            //Check that if a pawn is about to move forward that another piece is not about to take the square
            if (pieceType.toLowerCase() == "p" && source.charAt(0) == target.charAt(0) &&
                this.queryPieceCooldown(target) != false) {
                //A pawn is about to move forward and capture a piece illegally, return false
                return {legal: false};
            }

            //Check that the target square isn't being travelled to by a friendly piece
            //get piece on target square
            var targetPiece = this.queryPieceCooldown(target); 
            //check that the square is not blank
            if (targetPiece != false) {
                //If sqaure has piece, check that the target piece is same colour
                if (pieceColour == targetPiece.charAt(0)) {
                    //The piece on cooldown on target is friendly and is potentially travelling to sqaure, return false
                    return {false: false};
                }
            }
            
            //check if piece is king 
            var result;
            if (pieceType == "K") {
                //Piece is king so evaluate the king move
                result =  this.evalKingMove(source, piece, pieceColour, pieceType, target);  
            } else {
                //piece is not a king
                result =  this.evalNormalMove(source, piece, pieceColour, pieceType, target);
            }

            //Check if move was legal
            if (result.legal == true) {
                //Check if the target was on cooldown
                if (targetPiece != false) {
                    //check if the target is king
                    if (targetPiece.charAt(1) == "K" ) {
                        //king captured
                        this.gameOver = true;
                        //add flag to return object
                        result.gameOver = pieceColour;
                    }
                //Otherwise check there is a piece that is not on cooldown
                } else if (this.chess.get(target)) {
                    //check if target is king
                    if (this.chess.get(target).type == "k"){
                        //king captured
                        this.gameOver = true;
                        //add flag to return object
                        result.gameOver = pieceColour;
                    }
                }
            }

            //return result of the evaluation
            return result;

        } catch(error) {
            //An unforseen error as occured, log the error and carry on
            console.log("An error occured whilst evaluating the move: ");
            console.log(error);
            return {legal: false};
        }
    }

    removePiece(source, piece) {
        //remove piece from source sqaure
        //check that the correct piece is being removed
        var pieceOnSource = this.chess.get(source);
        if (piece.toLowerCase() == (pieceOnSource.color+pieceOnSource.type).toLowerCase()){
            this.chess.remove(source);
        }   
        
    }

    addPiece(target, piece) {
        //add piece to target sqaure
        this.chess.put({type: piece.charAt(1), color: piece.charAt(0)}, target);
    }

    
}

//Export the GameManager Class
module.exports = RealTimeChess;