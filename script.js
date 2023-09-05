// These are the global Variables 

let VIDEO = null;  // Displays Camera Feed on the canvas
let CANVAS = null; // It represents the canvas where the feed is drawn
let CONTEXT = null; // For drawing and manipulating puzzle pieces
let SCALER = 0.8; // camera feed will be scaled down to 80% of original size
let SIZE = {x:0,y:0,width:0,height:0,rows:3,columns:3}; // Info about the canvas size
let PIECES = []; // array to represent individual puzzle pieces 
let SELECTED_PIECE = null; // holds refrence to currently selected puzzle 
let START_TIME = null; // timestamp when the game starts
let END_TIME = null; // timestamp when the puzzle is completed


// Plays a pop sound when a puzzle is correctly placed
let POP_SOUND = new Audio("pop.mp3");
POP_SOUND.volume = 0.1;

//for generating and controlling audio in the project.
let AUDIO_CONTEXT = new (AudioContext || webkitAudioContext || window.webkitAudioContext) ();

// object defines musical note frequencies as properties.
let keys = {
    DO:261.6,
    RE:293.7,
    MI: 329.6
}


function main(){
    CANVAS = document.getElementById("myCanvas"); // video feed is drawn 
    CONTEXT = CANVAS.getContext("2d"); // represents 2D rendrering context
    
    addEventListeners(); // handles user interaction

    // access the user's camera and create a media stream for video input
    let promise = navigator.mediaDevices.getUserMedia({
        video: true // video access is requested.
    });

    
    // user grants permission to access the camera 
    promise.then(function(signal){ // Signal : represents the media stream from the user's camera.
        VIDEO = document.createElement("video"); // displays the camera feed
        VIDEO.srcObject = signal; //  connects the camera feed to the video element. 
        VIDEO.play(); // plays the video stream

        // when the video element has loaded enough data to begin playing. 
        VIDEO.onloadeddata = function(){
            handleResize(); // handles the initial sizing and positioning of the canvas and puzzle pieces based on the video feed's dimensions
            initializePieces(SIZE.rows,SIZE.columns); // initializes the puzzle pieces based on the specified number of rows and columns
            updateGame(); // continuously updates the canvas to display the camera feed and puzzle pieces
        }
        
    }).catch(function(err){ //  If there's an error accessing the camera
        document.getElementById("start").disabled = true; // disables the start button
        alert("Camera error: "+err); // erorr msg is displayed
    });
}

// responsible for setting the difficulty level of the puzzle game based on the user's selection from a dropdown menu

function setDifficulty(){
    let diff = document.getElementById("difficulty").value; // retrieves the selected difficulty level from the HTML dropdown menu with the ID "difficulty"

    switch(diff){
        case "easy":
            initializePieces(3,3); // initializing the puzzle with a 3x3 grid of pieces
            break;
        case "medium":
            initializePieces(5,5); // initializing the puzzle with a 5x5 grid of pieces
            break;
        case "hard":
            initializePieces(10,10); // initializing the puzzle with a 10x10 grid of pieces
            break;
        case "insane":
            initializePieces(40,25); // initializing the puzzle with a 40x25 grid of pieces
            break;
    }
}

// restarts the puzzle game when the user clicks the "Start" button

function restart(){
    START_TIME = new Date().getTime(); // marks the beginning of a new game
    END_TIME = null; // tracks the completion time of the puzzle
    randomizePieces(); // randomize the positions of the puzzle pieces
    document.getElementById("menuItems").style.display="none"; // hides the menu interface to allow the player to focus on solving the puzzle
}

// continuously updates and displays the elapsed time since the start of the puzzle game.

function updateTime(){
    
    let now = new Date().getTime(); // etrieves the current time in milliseconds

    if(START_TIME != null){ // the game has started
        if(END_TIME != null){ // checks if the game has been completed
            document.getElementById("time").innerHTML =
                formatTime(END_TIME-START_TIME);
            }else{ //  If the game is still in progress 
            // displays the elapsed time by subtracting the current time (now) from the START_TIME
            document.getElementById("time").innerHTML =
                formatTime(now-START_TIME);
        }
    }
}

// checkss whether the puzzle has been completed or not. 

function isComplete(){

    /*
    iterates through all the pieces in the PIECES array and checks if each piece's correct property
    is set to false. If it finds any piece with correct equal to false, it immediately returns false,
    indicating that the puzzle is not complete. If it doesn't find any such piece with correct equal to
    false, it returns true, indicating that all the pieces are in their correct positions, and the puzzle is 
    complete.
    */
    
    for(let i=0;i<PIECES.length;i++){
        if(PIECES[i].correct === false){
            return false;
        }
    }
    return true;
}

// takes a time duration in milliseconds as input and formats it into a string representation in the format "HH:MM:SS"

function formatTime(milliseconds){
    let seconds = Math.floor(milliseconds/1000);
    let s = Math.floor(seconds%60); // represents the seconds
    let m = Math.floor((seconds%(60*60))/60); // represents the minutes
    let h = Math.floor((seconds%(60*60*24))/(60*60)); // represents the hours

    let formattedTime = h.toString().padStart(2,'0'); // ensure that each component (hours, minutes, and seconds) is represented with at least two digits.
    //This means that if any component is less than 10, it will be padded with a leading '0' to maintain a consistent format.
    formattedTime += ":";
    formattedTime += m.toString().padStart(2,'0');
    formattedTime += ":";
    formattedTime += s.toString().padStart(2,'0');
    return formattedTime; // returns the formatted time string

}

// function sets up event listeners for various mouse and touch events on the CANVAS element

function addEventListeners(){
    // This event occurs when the mouse button is pressed down over the canvas. It calls the onMouseDown function when triggered.
    CANVAS.addEventListener("mousedown",onMouseDown);
    // when the mouse pointer moves over the canvas. It calls the onMouseMove function when triggered.
    CANVAS.addEventListener("mousemove",onMouseMove);
    // when the mouse button is released after being pressed down. It calls the onMouseUp function when triggered.
    CANVAS.addEventListener("mouseup",onMouseUp);
    // when a touch is initiated on the touch screen. It calls the onTouchStart function when triggered.
    CANVAS.addEventListener("touchstart",onTouchStart);
    // when a touch point is moved along the touch screen. It calls the onTouchMove function when triggered.
    CANVAS.addEventListener("touchmove",onTouchMove);
    // when a touch point is removed from the touch screen. It calls the onTouchEnd function when triggered.
    CANVAS.addEventListener("touchend",onTouchEnd);
}

// when the user presses the mouse button down while the cursor is over the canvas
function onMouseDown(evt){

    const imgData = CONTEXT.getImageData(evt.x,evt.y,1,1); //captures a 1x1 pixel region's image data at the specified coordinates.

    /*
        It checks the alpha channel (data[3]) of the captured pixel data. If the alpha channel is 0, it means the pixel
        is transparent (not part of the puzzle piece), and the function returns early. This step ensures that the
        user can only interact with non-transparent parts of the puzzle pieces.
    */
    if(imgData.data[3] == 0){
        return;
    }

    // If the pixel is not transparent, the function identifies the color of the clicked pixel in the format "rgb(r, g, b)"
    const clickedColor = "rgb("+imgData.data[0]+","+imgData.data[1]+","+imgData.data[2]+")";
    
    //  checks the coordinates of the mouse click and matches them to a puzzle piece on the canvas.
    SELECTED_PIECE = getPressedPiece(evt);
    
    if(SELECTED_PIECE != null){ // If a puzzle piece is successfully identified

        // It finds the index of the selected piece in the PIECES array and removes it from its current position using PIECES.splice(index, 1).
        const index = PIECES.indexOf(SELECTED_PIECE);

        if(index>-1){
            PIECES.splice(index,1);
            //pushes the selected piece to the end of the PIECES array, making it the top-most piece to ensure it's drawn on top of others
            PIECES.push(SELECTED_PIECE);
        }

        /*
            It stores the offset between the mouse cursor and the top-left corner of the selected piece 
            in the offset property of SELECTED_PIECE. This offset will be used to maintain the relative 
            position of the piece while dragging it.
        */
        
        SELECTED_PIECE.offset = {
            x:evt.x-SELECTED_PIECE.x,
            y:evt.y-SELECTED_PIECE.y
        }
        //It sets the correct property of SELECTED_PIECE to false, indicating that the piece is currently not in its correct position.
        SELECTED_PIECE.correct = false;
    }
}

// a touch event (e.g., tapping the screen with a finger) is initiated on the canvas
function onTouchStart(evt){ // object evt as its parameter, which contains information about the touch event
    /*
        It extracts the coordinates of the first touch point (touches[0]) from the TouchEvent object 
        and stores them in the loc object as x and y properties.
    */
    let loc = {
        x:evt.touches[0].clientX,
        y:evt.touches[0].clientY
    };
    // It then calls the onMouseDown function and passes the loc object as an argument. 
    // This effectively simulates a mouse click event at the location where the touch occurre
    onMouseDown(loc);
}

// a touch event (e.g., dragging a finger across the screen) is in progress on the canvas
function onTouchMove(evt){ // contains information about the ongoing touch event, including the position of the touch.
    let loc = {
        x:evt.touches[0].clientX,
        y:evt.touches[0].clientY
    };
    //It then calls the onMouseMove function and passes the loc object as an argument. 
    //This effectively simulates a mouse move event as the touch point is dragged across the screen.
    onMouseMove(loc);
}

//The onMouseUp() function is responsible for handling the logic when the user releases 
//the mouse button or, in this case, ends a touch interaction.
function onTouchEnd(){
    onMouseUp();
}

/*
    when the user moves the mouse pointer while a mouse button is pressed (i.e., during a drag operation). 
    Its purpose is to update the position of a selected puzzle piece when the user is dragging it across the canvas.
*/
function onMouseMove(evt){

    // If a puzzle piece is selected, it updates the x and y coordinates of the selected piece based on the current mouse position
    //and the initial offset stored when the piece was clicked.
    if(SELECTED_PIECE != null){
        SELECTED_PIECE.x = evt.x-SELECTED_PIECE.offset.x;
        SELECTED_PIECE.y = evt.y-SELECTED_PIECE.offset.y;
    }
}

// when the user releases the mouse button after dragging a puzzle piece.
function onMouseUp(){
    // If a piece is selected, it checks if the piece is close to its correct position using the isClose() method of the selected piece. 
    if(SELECTED_PIECE && SELECTED_PIECE.isClose()){
        //If the selected piece is close to its correct position, it calls the snap() method of the selected piece. 
        // This method likely snaps the piece into its correct position and may play a sound effect
        SELECTED_PIECE.snap();
        /*
            t checks if the puzzle is complete using the isComplete() function. If the puzzle is complete and the END_TIME is null 
            (indicating that the puzzle has just been completed), it records the current time as the END_TIME. Additionally, it sets 
            a timeout to play a melody (playMelody) after a delay of 500 milliseconds and displays the end screen using showEndScreen().
        */
        if(isComplete() && END_TIME == null){
            let now = new Date().getTime();
            END_TIME = now;
            setTimeout(playMelody,500);
            showEndScreen();
        }
    }
    SELECTED_PIECE = null; // no piece is currently selected for dragging.
}

/*
    determine if the user has clicked (or touched) on a puzzle piece at a specific location (loc). 
    It iterates through the PIECES array, which contains all the puzzle pieces, and checks whether the 
    provided location loc falls within the boundaries of each piece.
*/

function getPressedPiece(loc){
    // It starts by iterating backward through the PIECES array using a for loop, 
    // starting from the last piece (topmost piece in the rendering order) and moving 
    // towards the first piece.

    for(let i=PIECES.length-1;i>=0;i--){
        if(loc.x>PIECES[i].x && loc.x < PIECES[i].x + PIECES[i].width &&
            loc.y>PIECES[i].y && loc.y < PIECES[i].y + PIECES[i].height){
                return PIECES[i]; // If the loc is within the boundaries of a piece (i.e., it's inside the piece's rectangle), the function returns that piece.
            }
    }
    return null;
}

// finds a puzzle piece with a specific color within the PIECES array
/*
    used to identify and manipulate pieces based on their color, which can be 
    helpful in various puzzle-solving or game scenarios where different pieces may 
    have different properties or behaviors based on their colors.
*/

function getPressedPieceByColor(loc,color){
    // starts by iterating backward through the PIECES array using a for loop, starting from the last piece (topmost piece in the rendering order) 
    // and moving towards the first piece.
    for(let i=PIECES.length-1;i>=0;i--){
        if(PIECES[i].color == color){
            return PIECES[i];
        }
    }
    return null;
}

//  responsible for adjusting the size and position of the canvas and puzzle pieces when the window is resized. 
function handleResize(){

    /*
         setting the CANVAS element's width and height to match the current dimensions of the window 
         using the window.innerWidth and window.innerHeight properties. This ensures that the canvas 
         always covers the entire visible area of the browser window.
    */
    
    CANVAS.width = window.innerWidth;
    CANVAS.height = window.innerHeight;

    /*
        calculates a resizer value that is used to scale the puzzle's size while maintaining its aspect ratio. 
    */

    /*
        resizer is the product of SCALER (a constant scaling factor defined earlier in the code) and the minimum 
        scaling factor between the canvas's width divided by the video's width and the canvas's height divided by 
        the video's height. This ensures that the puzzle and video fit within the canvas while maintaining their 
        original aspect ratios.
    */
    
    let resizer = SCALER*
                Math.min(
                    window.innerWidth/VIDEO.videoWidth,
                    window.innerHeight/VIDEO.videoHeight
                );

    // SIZE.width and SIZE.height are set to the scaled dimensions of the video, 
    //ensuring that the puzzle pieces are appropriately sized based on the window dimensions.    
            SIZE.width = resizer*VIDEO.videoWidth;
            SIZE.height = resizer*VIDEO.videoHeight;
    // SIZE.x and SIZE.y are adjusted to center the puzzle within the canvas by calculating 
    //the center position based on the scaled dimensions and the canvas dimensions.
            SIZE.x = window.innerWidth/2-SIZE.width/2;
            SIZE.y = window.innerHeight/2-SIZE.height/2;
}

// core of the puzzle game and is responsible for rendering the game elements and updating the game state. 
function updateGame(){
// clearing the entire canvas using the CONTEXT.clearRect method. This ensures that the previous frame's content is removed, preventing visual artifacts.
    CONTEXT.clearRect(0,0,CANVAS.width,CANVAS.height);
    // It sets the global alpha of the canvas context to 0.5 temporarily using CONTEXT.globalAlpha. 
    // This creates a semi-transparent effect, making the video feed appear faded in the background.
    CONTEXT.globalAlpha = 0.5;
    // It draws the video feed (VIDEO) onto the canvas using CONTEXT.drawImage. 
    // The video is drawn at the position specified by SIZE.x and SIZE.y, and its dimensions are set to SIZE.width and SIZE.height. 
    //This ensures that the video is displayed within the puzzle area on the canvas.
    CONTEXT.drawImage(VIDEO,
        SIZE.x, SIZE.y,
        SIZE.width, SIZE.height);
    // It restores the canvas context's global alpha to 1, effectively making subsequent drawings fully opaque.
    CONTEXT.globalAlpha = 1;
    // It iterates through all puzzle pieces in the PIECES array and calls the draw method of each piece, 
    //passing the canvas context CONTEXT as an argument. This draws each puzzle piece onto the canvas

        for(let i=0;i<PIECES.length;i++){
            PIECES[i].draw(CONTEXT);
        }
        updateTime(); // updates the displayed time on the screen.
    window.requestAnimationFrame(updateGame); // it schedules the next frame to be rendered 
}

function getRandomColor(){
    const red = Math.floor(Math.random()*255);
    const green = Math.floor(Math.random()*255);
    const blue = Math.floor(Math.random()*255);

    return "rgb("+red+","+green+","+blue+")"
}

// responsible for setting up the puzzle pieces in your puzzle game
function initializePieces(rows,cols){
// It takes two parameters, rows and cols, which define the number of rows and columns for the puzzle grid.
    SIZE.rows = rows;
    SIZE.columns = cols; 

    PIECES = [];
    const uniqueRandomColors = [];
    
    // It uses nested loops to iterate through the rows and columns of the puzzle grid, creating a puzzle piece for each cell.
    for(let i=0;i<SIZE.rows;i++){
        for(let j=0;j<SIZE.columns;j++){

            // For each puzzle piece, it generates a random color using the getRandomColor function and assigns 
            //it to the color property of the piece. It ensures that each color used is unique by checking if it's 
            //already in the uniqueRandomColors array. If the color is not unique, it generates a new random color until a unique one is found.

            let color = getRandomColor();

            while(uniqueRandomColors.includes(color)){
                color = getRandomColor();
            }
            PIECES.push(new Piece(i,j,color));
        }
    }

    // It calculates and sets the top, bottom, left, and right properties of each puzzle piece. 
    //These properties determine how much each piece can move in different directions within the puzzle grid. 
    //The specific values for these properties are randomized to create a shuffled puzzle.
    
    let cnt =0;
    for(let i=0;i<SIZE.rows;i++){
        for(let j=0;j<SIZE.columns;j++){
            const piece = PIECES[cnt];

            if(i == SIZE.rows-1){
                piece.bottom = null;
            }else{
                const sgn = (Math.random()-0.5)<0?-1:1;
                piece.bottom = sgn * (Math.random()* 0.4+ 0.3);
            }

            if(j == SIZE.columns-1){
                piece.right = null;
            }else{
                const sgn = (Math.random() - 0.5)<0?-1:1;
                piece.right = sgn*(Math.random()*0.4 + 0.3);
            }

            if(j==0){
                piece.left = null;
            }else{
                piece.left = -PIECES[cnt-1].right;
            }

            if(i==0){
                piece.top = null;
            }else{
                piece.top = -PIECES[cnt-SIZE.columns].bottom;
            }

            cnt++; // It increments the cnt variable to keep track of the number of puzzle pieces created.
        }
    }

}

function randomizePieces(){
    for(let i=0;i<PIECES.length;i++){
        let loc = {
            x:Math.random()*(CANVAS.width-PIECES[i].width),
            y:Math.random()*(CANVAS.height-PIECES[i].height)
        }
        PIECES[i].x = loc.x; 
        PIECES[i].y = loc.y; 
        PIECES[i].correct = false;
    }
}

class Piece{ // The Piece class represents individual puzzle pieces in your puzzle game.
    constructor(rowIndex,colIndex,color){

        // The constructor takes three parameters: rowIndex, colIndex, and color. These parameters are used to initialize the properties of each puzzle piece.
        // rowIndex and colIndex represent the position of the piece within the puzzle grid.
        // color represents the color of the puzzle piece.
        
        this.rowIndex = rowIndex; // rowIndex and colIndex store the piece's position in the grid.
        this.colIndex = colIndex;
        this.x = SIZE.x+SIZE.width*this.colIndex/SIZE.columns; // x and y store the current position of the piece on the canvas.
        this.y = SIZE.y+SIZE.height*this.rowIndex/SIZE.rows;
        this.width = SIZE.width/SIZE.columns; // width and height store the dimensions of the piece.
        this.height = SIZE.height/SIZE.rows;
        // xCorrect and yCorrect store the correct position of the piece (used for checking if it's in the correct position).
        this.xCorrect = this.x;
        this.yCorrect = this.y;
        this.correct =  true; // correct is a boolean flag indicating whether the piece is in the correct position.
        this.color = color;
    }

    draw(context, useCam = true){  // responsible for rendering the puzzle piece on the canvas.

    /*
    It uses canvas drawing operations to create the appearance of the piece, including its shape and color.
    The useCam parameter determines whether to use the video feed (camera) as the background of the piece or fill it with a solid color 
    based on the piece's color property.
    
    The method first defines various constants related to the piece's appearance, such as sz, neck, tabWidth, and tabHeight.
    
    It then uses canvas drawing operations (e.g., moveTo, lineTo, bezierCurveTo, etc.) to draw the piece's shape based on its top, right, bottom, 
    and left properties.
    
    Depending on the useCam parameter, it either fills the piece with the camera feed or a solid color.
    
    The clip method is used to ensure that the piece's content doesn't extend beyond its boundaries.
    
    Finally, the method restores the canvas state and strokes the piece's outline.
    */    
        
        context.beginPath();
        
            
        const sz = Math.min(this.width,this.height);
        const neck = 0.05*sz;
        const tabWidth = 0.2*sz;
        const tabHeight = 0.2*sz;

        // From top to left 
        context.moveTo(this.x,this.y);
        // To top right
        if(this.top){
            context.lineTo(this.x+this.width*Math.abs(this.top) - neck, this.y);

            context.bezierCurveTo(
                this.x + this.width*Math.abs(this.top) - neck,
                this.y - tabHeight*Math.sign(this.top) * 0.2,
                this.x + this.width*Math.abs(this.top) - tabWidth,
                this.y - tabHeight*Math.sign(this.top),
                this.x + this.width*Math.abs(this.top),
                this.y - tabHeight*Math.sign(this.top)
            );

            context.bezierCurveTo(
                this.x + this.width*Math.abs(this.top) + tabWidth,
                this.y - tabHeight*Math.sign(this.top),
                this.x + this.width*Math.abs(this.top) + neck,
                this.y - tabHeight*Math.sign(this.top)*0.2,
                this.x + this.width*Math.abs(this.top) + neck,
                this.y
            );

        }
        context.lineTo(this.x+this.width,this.y);

        // To bottom right
        if(this.right){
            context.lineTo(this.x+this.width,this.y+this.height*Math.abs(this.right)-neck);

            context.bezierCurveTo(
                this.x + this.width-tabHeight*Math.sign(this.right)*0.2,
                this.y + this.height*Math.abs(this.right) - neck,
                this.x + this.width-tabHeight*Math.sign(this.right),
                this.y + this.height*Math.abs(this.right) - tabWidth,
                this.x + this.width-tabHeight*Math.sign(this.right),
                this.y + this.height*Math.abs(this.right)
            );
            
            context.bezierCurveTo(
                this.x + this.width-tabHeight*Math.sign(this.right),
                this.y + this.height*Math.abs(this.right)+tabWidth,
                this.x + this.width-tabHeight*Math.sign(this.right) * 0.2,
                this.y + this.height*Math.abs(this.right) + neck,
                this.x + this.width,
                this.y + this.height*Math.abs(this.right) + neck
            );

        }
        context.lineTo(this.x+this.width,this.y+this.height);

        // To bottom left
        if(this.bottom){
            context.lineTo(this.x+this.width*Math.abs(this.bottom) + neck, this.y+this.height);

            context.bezierCurveTo(
                this.x + this.width*Math.abs(this.bottom) + neck,
                this.y + this.height+tabHeight*Math.sign(this.bottom) * 0.2,
                this.x + this.width*Math.abs(this.bottom) + tabWidth,
                this.y + this.height+tabHeight*Math.sign(this.bottom),
                this.x + this.width*Math.abs(this.bottom),
                this.y + this.height+tabHeight*Math.sign(this.bottom)
            );

            context.bezierCurveTo(
                this.x + this.width*Math.abs(this.bottom) - tabWidth,
                this.y + this.height+tabHeight*Math.sign(this.bottom), 
                 this.x + this.width*Math.abs(this.bottom) - neck,
                this.y + this.height+tabHeight*Math.sign(this.bottom) * 0.2,
                this.x + this.width*Math.abs(this.bottom) - neck, 
                this.y + this.height
            );
       }
        context.lineTo(this.x,this.y+this.height);

        // To top left
        if(this.left){
            context.lineTo(this.x,this.y+this.height*Math.abs(this.left) + neck);

            context.bezierCurveTo(
                this.x + tabHeight*Math.sign(this.left) * 0.2,
                this.y + this.height*Math.abs(this.left) + neck,
                this.x + tabHeight*Math.sign(this.left),
                this.y + this.height*Math.abs(this.left) + tabWidth,
                this.x + tabHeight*Math.sign(this.left),
                this.y + this.height*Math.abs(this.left)
            );

            context.bezierCurveTo(
                this.x + tabHeight*Math.sign(this.left),
                this.y + this.height*Math.abs(this.left) - tabWidth,
                this.x + tabHeight*Math.sign(this.left) * 0.2,
                this.y + this.height*Math.abs(this.left) - neck,
                this.x,
                this.y + this.height*Math.abs(this.left) - neck
            );
        }
        context.lineTo(this.x,this.y);

        context.save();
        context.clip();

        const scaledTabHeight = Math.min(VIDEO.videoWidth/SIZE.columns,
                                VIDEO.videoHeight/SIZE.rows)*tabHeight/sz;

        if(useCam){
            context.drawImage(VIDEO,
                this.colIndex*VIDEO.videoWidth/SIZE.columns
                 - scaledTabHeight,
                this.rowIndex*VIDEO.videoHeight/SIZE.rows
                 - scaledTabHeight,
                VIDEO.videoWidth/SIZE.columns
                 + scaledTabHeight*2,
                VIDEO.videoHeight/SIZE.rows
                 + scaledTabHeight*2,
                this.x - tabHeight,
                this.y - tabHeight,
                this.width + tabHeight*2,
                this.height + tabHeight*2);
        }else{
            context.fillStyle = this.color;
            context.fillReact(this.x-tabHeight,this.y-tabHeight,this.width+tabHeight*2,this.height*tabHeight*2);
        }    


        context.restore();    

        context.stroke();
    }
    isClose(){
        /*
            The isClose method checks whether the piece is close to its correct position. 
            It calculates the distance between the current position (x and y) and the correct position 
            (xCorrect and yCorrect) and checks if it's less than one-third of the piece's width. If so, 
            it returns true, indicating that the piece is close to its correct position; otherwise, it returns false.
        */
        
        if(distance({x:this.x,y:this.y},
            {x:this.xCorrect,y:this.yCorrect})<this.width/3){
                return true;
            }
            return false;
    }
    snap(){
        /*
            The snap method is called when a piece is correctly placed in its position.
            
            It updates the x and y properties to match the correct position (xCorrect and yCorrect).
            
            It sets the correct flag to true to indicate that the piece is in the correct position.
            
            It plays a "pop" sound using the POP_SOUND audio object, providing audio feedback to the player.
        */
        this.x = this.xCorrect;
        this.y = this.yCorrect;
        this.correct = true;
        POP_SOUND.play();
    }
}

function distance(p1,p2){ // Calculates the Euclidean distance between two points p1 and p2 in a 2D space.
    return Math.sqrt(
        (p1.x - p2.x) * (p1.x - p2.x) + 
        (p1.y - p2.y) * (p1.y - p2.y));
}


function playNote(key,duration){
    /*
        Plays a musical note of a specified frequency (key) for a given duration (duration) using the Web Audio API.
        It creates an oscillator, sets its frequency, and schedules its start and stop times.
        Envelopes are used to control the volume and create a simple sound effect.
    */
    
    let osc = AUDIO_CONTEXT.createOscillator();
    osc.frequency.value = key;
    osc.start(AUDIO_CONTEXT.currentTime);
    osc.stop(AUDIO_CONTEXT.currentTime + duration/1000);
    
    let envelope = AUDIO_CONTEXT.createGain();
    osc.connect(envelope);
    osc.type = "triangle";
    envelope.connect(AUDIO_CONTEXT.destination);
    envelope.gain.setValueAtTime(0,AUDIO_CONTEXT.currentTime);
    envelope.gain.linearRampToValueAtTime(0.5,AUDIO_CONTEXT.currentTime + 0.1);
    envelope.gain.linearRampToValueAtTime(0,AUDIO_CONTEXT.currentTime + duration/1000);

    setTimeout(function(){
        osc.disconnect();
    }, duration);
}

function playMelody(){ // Plays a melody by calling playNote function with different frequencies and durations.
                      // It plays notes sequentially to create a melody effect.
    playNote(keys.MI,300);
    setTimeout(function(){
        playNote(keys.DO,300);
    }, 300);
    setTimeout(function(){
        playNote(keys.RE,150);
    }, 450);
    setTimeout(function(){
        playNote(keys.MI,600);
    }, 600);
}

/*
    Displays an end screen when the puzzle is completed.
    It calculates the player's score (time taken to complete the puzzle) and displays it.
    The end screen becomes visible to the player.
*/
function showEndScreen(){
    const time = Math.floor((END_TIME-START_TIME)/1000);
    document.getElementById("scoreValue").innerHTML="Score: "+time;
    document.getElementById("endScreen").style.display= "block";
}

function showMenu(){
    // Hides the end screen and displays the game menu.
// Allows the player to restart the game or choose different difficulty levels.
    document.getElementById("endScreen").style.display = "none";
    document.getElementById("menuItems").style.display = "block";
}

function showScores(){
    // Hides the end screen and displays the scores screen.
    // This function seems to be intended to fetch and display high scores for different difficulty levels,
    // but it currently displays "Loading..." and doesn't fetch scores.
    
    document.getElementById("endScreen").style.display = "none";
    document.getElementById("scoresScreen").style.display = "block";
    document.getElementById("scoresContainer").innerHTML="Loading...";
    getScores();
}

function closeScores(){ // Closes the scores screen and returns to the end screen.

    document.getElementById("endScreen").style.display="block";
    document.getElementById("scoresScreen").style.display="none";
}

function getScores(){
    fetch("server.php").then(function(response){
        response.json().then(function (data){
            console.log(data);
        });
    });
}

// Formats the retrieved scores data into an HTML table.
// This function appears to be intended for formatting and displaying 
// high scores but is not fully implemented in the provided code.

function formatScores(data){
    let html = "<table style='width:100%;text-align:center;'>";
    html += formatScoreTable(data["easy"],"Easy");
    html += formatScoreTable(data["medium"],"Medium");
    html += formatScoreTable(data["hard"],"Hard");
    html += formatScoreTable(data["insane"],"Insane");

    return html;
}

// Formats a specific score table with a given header (difficulty level).
// Constructs an HTML table row for each high score entry, including the player's name and time taken to complete the puzzle.

function formatScoreTable(data,header){
   let html = "<tr style = 'background:rgb(123,146,196);color:white'>";
    html+= "<td></td><td><b>"+header+"</b></td><td><b>Time</b></td></tr>";

    for(let i=0;i<data.length;i++){
        html += "<tr>";
        html += "<td>" + (i+1) + ".</td> <td title='" +data[i]["Name"] + 
                "'>" + data[i]["Name"] + "</td><td>" + Math.floor(data[i]["Time"]/1000) + "</td></tr>";
    }
    return html;
}
