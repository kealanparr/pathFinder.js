// This was my challenge to see how much I could do with Vanilla JS, without frameworks or libraries. I often see people sharing: http://youmightnotneedjquery.com/ and agree completely. 
// The A* algorithm uses the Manhattan search to compute the distance, as I know people normally use either Manhattan or Eucledian.
// I mainly chose path finding algorithms as a topic of study because I knew nothing about it, and enjoy a challenge, so picked what I would struggle with the most.

"use strict"; // I program in TypeScript where I work, so quite liked the errors thrown, kind of like a compiler, as it caught some bugs early.

// Some global variables that made the whole programme running simpler. Kept to a minimum.
var number,         // Number of rows + columns
    startIndex = 0, // Start index on the grid
    endIndex = 0;   // End index on the grid     

// I removed the oncontextmenu because in the site, it's very unaesthetic and ugly.
// It only obscured the grid, and provided poor UX.
document.oncontextmenu = function() {
    return false;
}

/*<Summary> In an attempt to logically group functions/methods, we place all grid manipulation (aside from the path finding algorithms) on the grid object.
 */
const Grid = {

    tutorialTextIndex: -1,

    startButtonPressed: false, // Should the next click on the grid, define the start square?
    endButtonPressed: false,   // Should the next click on the grid, define the end square?

    tutorialMesage: ["Welcome to the path finding simulation!",
        "This is a short introduction, how to use the programme.",
        "These buttons specify what size of grid you want to render.",
        "Click this button, then click a cell on the grid, to specify a start point.",
        "Click this button, then click a cell on the grid, to specify an end point.",
        "This randomly generates obstacles on the grid.",
        "If you don't want to use the random generation button, then either click and drag on the grid or single click a cell. Do the same to remove obstacles.",
        "This button completely clears the grid of all obstacles and start and end point.",
        "This button starts the Djikstra algorithm. You can read more <a target='_blank' href='https://tinyurl.com/dxg5nzc'>here</a>, but essentially it explores every node exhuastively.",
        "This Button start the A* algorithm. You can read more <a target='_blank' href='https://tinyurl.com/7r67n3d'>here</a>, but essentially it only explores cells that are in the direction of the end.",
        "Authored by Kealan Parr, 28/06/2018."
    ],

    // There are nulls here as some of the above message don't require a button to be highlighted.
    buttonsToHighlight: [null,
        null,
        document.getElementById("GridRender"),
        document.getElementById("StartButton"),
        document.getElementById("EndButton"),
        document.getElementById("ObstacleGenerate"),
        null,
        document.getElementById("ClearGrid"),
        document.getElementById("Djikstra"),
        document.getElementById("AStar"),
        null
    ],

    /*<Summary> Clears the grid, and removes all the classes applied, also clears the info, and some other bits to start over fresh.
     */
    ClearGrid: function() {
        const grid = document.querySelectorAll('.boxSmall, .boxMedium, .boxLarge');
        const info = document.getElementById("information");

        for (let i = 0; i < grid.length; i++) {
            grid[i].classList.remove("explored", "end", "start", "optimalPath", "hitTheEndPoint", "obstacle");
            grid[i].heuristic = 0;
        }
        info.innerHTML = "";
        startIndex = 0;
        endIndex = 0;
        main.style.pointerEvents = "auto"; // If you clear the grid mid algo, we want to ensure the next time you can still click. 
        document.getElementById("information").innerHTML = ""; // We dont need to keep the warning up for the user, if they're rendering a grid.
    },

    /*<Summary> Actually disposes and deletes the grid; not just clearing the grid.
     */
    DeleteGrid: function() {
        const grid = document.querySelectorAll('.boxSmall, .boxMedium, .boxLarge, br');
        for (let i = 0; i < grid.length; i++) {
            let elem = grid[i];
            elem.parentNode.removeChild(elem);
        }
    },

    /*<Summary> Responsible for randomly generating obstacles in the grid, ~25% chance that the square will be an obstacle.
     */
    RandomObstacleGeneration: function() {
        const grid = document.querySelectorAll('.boxSmall, .boxMedium, .boxLarge');
        if (grid.length) { // Just check the grid has been rendered. Or else we will warn the user they need to render a grid first
            for (let i = 0; i < grid.length; i++) {
                let highlight = (Math.round((Math.random()) * 100) / 100) // Generare a random number
                if (highlight > 0.75) {
                    grid[i].classList.add("obstacle")
                    grid[i].heuristic = Infinity; // For the A* algo, we can quickly add the heuristic.
                } else {
                    // This class removal is just to ensure the user can click randomly generate button multiple times, and "try again" if they're not happy with the generation
                    grid[i].classList.remove("obstacle")
                    grid[i].heuristic = 0; // The grid has changed, so the heuristic for A* has changed.
                    continue; // We won't make this grid an obstacle. Carry on.
                }
            }
        } else {
            document.getElementById("information").innerHTML = "You must first render a grid before you randomly generate obstacles.";
        }
    },

    /*<Summary> Renders a small, medium or large grid.
     */
    RenderGrid: function() {

        let boxSizeClass = "", // CSS class to apply to the cells of the grid (changes if they render a small grid, medium grid or large grid). 
            checkedRadioButton,
            id = 0;
        const radioButtons = document.getElementsByName('gridSize');

        Grid.DeleteGrid(); // If there's already a grid, dispose of anything before we draw a new grid.

        for (let i = 0; i < radioButtons.length; i++) {
            if (radioButtons[i].checked) {
                checkedRadioButton = radioButtons[i];
            }
        }

        // The number variable is the number of rows and columns we render, and the boxSizeClass is the css styling we apply to each of the cells in the grid.
        switch (checkedRadioButton.value) {
            case 'small':
                number = 15;
                boxSizeClass = "boxSmall";
                break;
            case 'medium':
                number = 25;
                boxSizeClass = "boxMedium";
                break;
            case 'large':
                number = 35;
                boxSizeClass = "boxLarge"
                break;
        }

        for (let x = 1; x <= number; x++) { // This deals with total numbers of rows
            for (let i = 1; i <= number; i++) { // This deals with drawing one row

                const div = document.createElement("div");
                div.classList.add(boxSizeClass);
                div.id = id; // We use the ID to uniquely identify the cells, when evaluating etc.
                id++; // Don't let the id's be the same! Increment.

                if (i === 1) {
                    div.leftEdge = true;
                    let linebreak = document.createElement("br"); // Push the next row onto a new line
                    document.getElementById("main").appendChild(linebreak);
                } else if (i === number) {
                    div.rightEdge = true;
                }

                document.getElementById("main").appendChild(div);
            }
        }
        Grid.AttachEventListeners(); // Attaches listeners to the parent container of my grid.
    },

    /*<Summary> Attaches event listeners to the main container. Avoids attaching event listeners to every cell, so we can bubble to parent.
     */
    AttachEventListeners: function() {

        const main = document.getElementById('main');
        let drag = "";

        // This was used to have "create drags" and "delete drags"
        // If your first click of the drag, begins on an obstacle grid, your drag will only ever remove obstacles
        // If your first click of the drag, begins on a free cell, you will only ever create obstacles.
        // Or you can individually click a cell to toggle obstacle on/off
        main.onmousedown = function(ev) {
            if (ev.target.classList.contains("obstacle")) {
                drag = "remove";
            } else if (ev.target.className.startsWith('box')) {
                drag = "create";
            } else {
                drag = "";
            }
        }

        main.onmouseup = function(ev) {
            drag = "";
        }

        /*<Summary> Handles drag events, 
         */
        function dragHandler(ev) {
            if (drag === "create" && ev.target.className.startsWith('box') && !ev.target.classList.contains('start') && !ev.target.classList.contains('end')) { // End button check so that we dont add obstacle class to end as well as end class. bug here
                ev.target.classList.add("obstacle");
            } else if (drag === "remove" && ev.target.className.startsWith('box')) {
                ev.target.classList.remove("obstacle");
            }
        }

        /*<Summary> Handles mousemove event.
         */
        function mouseMoveHandler(ev) {
            if (drag === "create" && ev.target.className.startsWith('box') && !ev.target.classList.contains('start') && !ev.target.classList.contains('end')) {
                ev.target.classList.add("obstacle");

            } else if (drag === "remove" && ev.target.className.startsWith('box')) {
                ev.target.classList.remove("obstacle");
            }
        }

        /*<Summary> Handles mouse down events. We add start and end buttons before we add obstacles.
         */
        function mouseDownHandler(ev) { // handles setting start and end square
            if (ev.target.className.startsWith('box') && Grid.endButtonPressed) {
                ev.target.classList.add("end");
                Grid.endButtonPressed = false;
                ev.preventDefault();
                return;
            } else if (ev.target.className.startsWith('box') && Grid.startButtonPressed) {
                ev.target.classList.add("start");
                Grid.startButtonPressed = false;
                ev.preventDefault();
                return;
            } else if (ev.target.className.startsWith('box') && !ev.target.classList.contains('start') && !ev.target.classList.contains('end')) {
                ev.target.classList.toggle("obstacle");
                return;
            }
        }

        // We add it to the parent, to avoid attaching eventListeners to every single child.
        // Essentially event bubbling to the parent.    
        main.addEventListener("mousedown", mouseDownHandler);
        main.addEventListener('mousemove', mouseMoveHandler);
        main.addEventListener('drag', dragHandler);
    },

    /*<Summary> Checks firstly if there's an start point, then that there is only ONE start point, and then if not warns the user.
     */
    StartButton: function() {
        const grid = document.querySelectorAll('.boxSmall, .boxMedium, .boxLarge');
        let isThereAlreadyAStartDefined = false;
        if (!grid.length) {
            document.getElementById("information").innerHTML = "Please render a grid before trying to enter a start point.";
        } else if (grid.length) {
            for (let i = 0; i < grid.length; i++) {
                if (grid[i].classList.contains("start")) {
                    isThereAlreadyAStartDefined = true;
                    document.getElementById("information").innerHTML = "You cannot place more than one start/end point";
                }
            }
            if (!isThereAlreadyAStartDefined) {
                Grid.startButtonPressed = true;
                Grid.endButtonPressed = false;
                return;
            }
        }
    },

    /*<Summary> Checks firstly if there's an end point, then that there is only ONE end point, and then if not warns the user.
     */
    EndButton: function() {
        const grid = document.querySelectorAll('.boxSmall, .boxMedium, .boxLarge');
        let isThereAlreadyAnEndDefined = false;
        if (!grid.length) {
            document.getElementById("information").innerHTML = "Please render a grid before trying to enter a start point.";
        } else if (grid.length) {
            for (let i = 0; i < grid.length; i++) {
                if (grid[i].classList.contains("end")) {
                    isThereAlreadyAnEndDefined = true;
                    document.getElementById("information").innerHTML = "You cannot place more than one start/end point";
                }
            }
            if (!isThereAlreadyAnEndDefined) {
                Grid.startButtonPressed = false;
                Grid.endButtonPressed = true;
                return;
            }
        }
    },

    /*<Summary> Change the tutorial message
    <forwards>      - Are we going forwards a message? Or backwards to an old message.
    <tutorialBox>   - The div we display the text.
    <darkWash>      - The div that is the overlay background. Dark colored.
    */
    Progress: function(forwards, tutorialBox, darkWash) {

        // As long as there's a message forwards, and we're trying to go forwards.     
        if (Grid.tutorialMesage[this.tutorialTextIndex + 1] && forwards) {
            this.tutorialTextIndex++;
            tutorialBox.innerHTML = Grid.tutorialMesage[this.tutorialTextIndex];
        } // As long as there's a message backwards, and we're trying to go backwards. 
        else if (Grid.tutorialMesage[this.tutorialTextIndex - 1] && !forwards) {
            this.tutorialTextIndex--;
            tutorialBox.innerHTML = Grid.tutorialMesage[this.tutorialTextIndex];
        }

        // Unhighlight all buttons
        for (let i = 0; i < Grid.buttonsToHighlight.length; i++) {
            if (Grid.buttonsToHighlight[i] !== null) {
                Grid.buttonsToHighlight[i].style.backgroundColor = "";
            }
        }

        // Highlight the single button we want to draw attention to with our message.
        if (Grid.buttonsToHighlight[this.tutorialTextIndex] !== null && this.tutorialTextIndex != -1) {
            Grid.buttonsToHighlight[this.tutorialTextIndex].style.backgroundColor = "yellow";
        }
    },

    /*<Summary> Educate the user how to use the programme.
     */
    Instruction: function() {

        // I wanted a way to explain the programme once, then stop forcing the explanation to appear.
        // One way to persist Js variables across 1 session despite refreshes is by attaching variables to the window object. 
        // This now is carried across all page refreshes, until a new tab is opened.
        if ("name" in window) {
            if (window.name !== "explained") {

                // DARKWASH
                // Dark wash is to stop the user clicking away and draw attention to the tutorial box
                const darkWash = document.createElement("div");
                darkWash.classList.add("darkWash");
                // Clicking on the dark wash won't dismiss it.
                darkWash.onclick = () => {
                    return false;
                }
                main.appendChild(darkWash);

                // TUTORIAL BOX
                // The box we display the text to instruct the user
                const tutorialBox = document.createElement("div");
                tutorialBox.classList.add("tutorialBox");
                main.appendChild(tutorialBox);

                // CLOSE BUTTON - X IN TOP RIGHT CORNER
                // The dismiss button if you know what you're doing or don't want the intro
                const close = document.createElement("div");
                close.classList.add("close");
                tutorialBox.appendChild(close);
                const elem = document.createElement("p");
                elem.classList.add("XButton")
                const X = document.createTextNode("X");
                close.appendChild(elem);
                elem.appendChild(X);
                close.onclick = () => {
                    tutorialBox.style.display = "none";
                    darkWash.style.display = "none";
                    // Unhighlight all buttons
                    for (let i = 0; i < Grid.buttonsToHighlight.length; i++) {
                        if (Grid.buttonsToHighlight[i] !== null) {
                            Grid.buttonsToHighlight[i].style.backgroundColor = "";
                        }
                    }
                }

                // The tutorial text
                const tutorialTextDiv = document.createElement("div");
                tutorialBox.appendChild(tutorialTextDiv);
                tutorialTextDiv.classList.add("tutorialText")

                // Just to begin with, we set the start message explicitly here to the 0 index text in the earray messages
                const tutorialText = document.createTextNode("Welcome to the path finding simulation!");
                tutorialTextDiv.appendChild(tutorialText);

                const forwards = document.createElement("div");
                const backwards = document.createElement("div");

                forwards.classList.add("forwards");
                backwards.classList.add("backwards");

                // create two divs. bottom left and right, and add the forwards and back to it. then apply forwards and backwads class already set ip
                let clickBackwards = document.createTextNode("<");
                let clickForward = document.createTextNode(">");

                backwards.onclick = () => {
                    this.Progress(false, tutorialTextDiv, darkWash);
                }
                forwards.onclick = () => {
                    this.Progress(true, tutorialTextDiv), darkWash;
                }

                tutorialBox.appendChild(backwards);
                tutorialBox.appendChild(forwards);

                forwards.appendChild(clickForward);
                backwards.appendChild(clickBackwards);

                // Ensure we don't pop up another explanation constantly with each refresh. Set the window name.
                window.name = "explained";
            }
        }
    }
}

/*<Summary> In an attempt to logically group functions/methods, we place all algorithm functions inside the Algorithm object.
 */
const Algorithm = {

    /*<Summary> Visualises the A* algorithm.
     */
    AStar: function() {

        const timeStart = performance.now(), // Start the stopwatch
            grid = document.querySelectorAll('.boxSmall, .boxMedium, .boxLarge'),
            info = document.getElementById("information");

        main.style.pointerEvents = "none"; // When the A* algorithm runs, you can't change the grid. You can't add obstacles or remove them.

        const StartAndEndDefined = Algorithm.CheckStartAndEndPoint(grid);

        if (StartAndEndDefined) {

            // If we warned a user in the past for not rendering a grid/ we displayed the time of their last algo, we remove that.
            document.getElementById("information").innerHTML = "";

            // Inside the Manhattan method, every available node needs a heuristic. So we're going to add that.
            for (let i = 0; i < grid.length; i++) {
                // This add a heuristic to each grid square, using the Manhattan distance.
                Algorithm.AddHeuristic(grid[i], i);
            }

            // Always hit the first four around the start point irregardless of heurstic score.
            // Do the initial hit around the start point.
            // Up, down, left, right.
            Algorithm.InitialHit(grid, "A*");

            // Recursively visualise Djikstra. We have the necesary start point. 
            Algorithm.RecurseAStar(grid, timeStart, info);
        }
    },

    /*<Summary> Visualises the Djikstra algorithm.
     */
    Djikstra: function() {

        const timeStart = performance.now(), // Start the stopwatch
            grid = document.querySelectorAll('.boxSmall, .boxMedium, .boxLarge'),
            info = document.getElementById("information");

        main.style.pointerEvents = "none"; // When the Djikstra algorithm runs, you can't change the grid. You can't add obstacles or remove them.

        // From this we get the start and end point, and we also ensure there is a start and end point selected.
        const StartAndEndDefined = Algorithm.CheckStartAndEndPoint(grid);

        if (StartAndEndDefined) {

            // If we warned a user in the past for not rendering a grid/ we displayed the time of their last algo, we remove that.
            document.getElementById("information").innerHTML = "";

            // Do the initial hit around the start point.
            // Up, down, left, right.
            setTimeout(Algorithm.InitialHit(grid, "Djikstra"), 125);

            // Recursively visualise Djikstra. We have the necesary start point. 
            Algorithm.RecurseDjikstra(grid, timeStart, info);
        }
    },

    /*<Summary> Does some basic formating for the stopwatch, and appends it to the DOM. 
    <timeStart> The start of the stopwatch.
    <stopW>     The DOM element where we can append the total time it took. 
    <algorithm> This method deals with the success of Djikstra and A*, so we override the string depending on what algorithm ran.
    */
    Success: function(timeStart, info, algorithm) {

        // Stop the stopwatch, change from miliseconds into seconds, and format it to 2dp.
        let timeEnd = performance.now();
        const totalTime = ((timeEnd - timeStart) / 1000).toFixed(2);

        // Add it to the screen, and allow the user to interact with the DOM again.
        info.innerHTML = algorithm + "'s algorithm took " + totalTime + " seconds.";
        main.style.pointerEvents = "auto";
    },

    /*<Summary> This recurses until the end point has been hit in the Djikstra, or until there is no more of the grid left unexplored.
    <grid>        The entire collection of cells 
    */
    RecurseDjikstra: function(grid, timeStart, info) {

        // These are lets as we will redefine them when we recursively call our method. 
        let unexploredNodes = [], // Array of the points we're going to explore. 
            endTheAlgorithm = false; // Should we finish the algo? Have we hit the end square?

        for (let i = 0; i < grid.length; i++) {
            // The current node where we will explore one up, down, left, right
            let current = grid[i],
                up = grid[i - number],
                down = grid[i + number],
                left = grid[i - 1],
                right = grid[i + 1];

            if (current.classList.contains("explored")) {
                if (current.leftEdge) { // The left edge property is added to all elements on the far left edge. So we can't explore futher left, or we go to the furthest right point of the row above.

                    // We're on the left edge, we can't evaluate left. 
                    if (up && Algorithm.IsElementExplorable(up) && Algorithm.NoDuplicates(up, unexploredNodes)) {
                        unexploredNodes.push(up);
                    }
                    if (down && Algorithm.IsElementExplorable(down) && Algorithm.NoDuplicates(down, unexploredNodes)) {
                        unexploredNodes.push(down);
                    }
                    if (right && Algorithm.IsElementExplorable(right) && Algorithm.NoDuplicates(right, unexploredNodes)) {
                        unexploredNodes.push(right);
                    }
                } else if (current.rightEdge) { // The right edge property is added to all elements on the far right edge. So we can't explore futher right, or we go to the furthest left point of the row below.

                    // We're on the right edge, we can't evaluate the right cell. 
                    if (up && Algorithm.IsElementExplorable(up) && Algorithm.NoDuplicates(up, unexploredNodes)) {
                        unexploredNodes.push(up);
                    }
                    if (down && Algorithm.IsElementExplorable(down) && Algorithm.NoDuplicates(down, unexploredNodes)) {
                        unexploredNodes.push(down);
                    }
                    if (left && Algorithm.IsElementExplorable(left) && Algorithm.NoDuplicates(left, unexploredNodes)) {
                        unexploredNodes.push(left);
                    }

                } else {
                    // We're not on any edge (except top or bottom), and we'll just check if it's falsy before pushing.
                    // We can't do this on left or right, as the points wouldn't be falsy. They would just be on the wrong row!

                    if (right && Algorithm.IsElementExplorable(right) && Algorithm.NoDuplicates(right, unexploredNodes)) {
                        unexploredNodes.push(right);
                    }
                    if (left && Algorithm.IsElementExplorable(left) && Algorithm.NoDuplicates(left, unexploredNodes)) {
                        unexploredNodes.push(left);
                    }

                    // Is there a row above you? 
                    if (up && Algorithm.IsElementExplorable(up) && Algorithm.NoDuplicates(up, unexploredNodes)) {
                        unexploredNodes.push(up);
                    }
                    // Is there a row below you? 
                    if (down && Algorithm.IsElementExplorable(down) && Algorithm.NoDuplicates(down, unexploredNodes)) {
                        unexploredNodes.push(down);
                    }
                }
            }
        }

        // Check that there is still grid to explore! If we've recursed a few times and there's an impossible game, return.
        if (unexploredNodes.length === 0) {
            Algorithm.Impossible(info);
            return;
        }

        // As we iterate through the unexplored nodes, to add the explored class, check it isn't the end.
        for (let i = 0; i < unexploredNodes.length; i++) {
            if (unexploredNodes[i].id === endIndex.toString()) {
                endTheAlgorithm = true;
            } else {
                unexploredNodes[i].classList.add("explored");
            }
        }

        // Have we hit the end point yet? No? Continue to recurse. 
        if (!endTheAlgorithm) { // These 3 last parameters are to be passed to my Recurse method
            setTimeout(Algorithm.RecurseDjikstra, 125, grid, timeStart, info)
        } else {
            Algorithm.Success(timeStart, info, "Djikstra");
        }
    },

    /*<Summary>   Adds a heuristic, via the Manhattan method to the cell.  
   <elem>       - The individual grid square div element.
   <currIndex>  - The current index from where we want to work out to the end.
   <endIndex>   - The end square, where we want to work to.
   */
    AddHeuristic: function(elem, currIndex) {
        if (elem.heuristic) { // Have we already added it in the random obstacle generation? If so, return.
            return;
        }

        if (elem.classList.contains("obstacle")) { // It's an obstacle, it's heuristic is Infinity. Because we don't want to explore it.
            elem.heuristic = Infinity;
            return;
        }

        // If its the end, give it the minimum heuristic.
        // We do this as in the RecurseAStar() method we only ever travel to the 4 points in the grid with the lowest heuristic. So we add a heuristic that if we encounter, will ALWAYS be lowest
        if (elem.classList.contains("end")) {
            elem.heuristic = -1;
            return;
        }

        // Get the start and end Y positions.
        let endY = Math.floor(endIndex / number),
            endX = 0,
            startY = Math.floor(currIndex / number),
            startX = 0;

        if (currIndex < number) {
            startX = currIndex; // If it's on the first row, that's the X pos
        } else {
            startX = (currIndex % number); // Else modullo divide by the number of the rows
        }

        if (endIndex < number) {
            endX = endIndex; // If it's on the first row, that's the X pos
        } else {
            endX = (endIndex % number); // Else modullo divide by the number of the rows
        }
        elem.heuristic = (Math.abs(startX - endX) + Math.abs(startY - endY)); // We add a  heuristic property to the div object
        return;
    },

    /*<Summary>  Finds the start point on the grid, and hits the beginning points where applicable. One up, down, left and right (so long as no obstacles there).  Abstracted away to be used across A* and Djikstra. 
    <grid>      -The entire grid.
    <algorithm> A string used in the Success() method, where we append either "Djikstra's algo took ...." or "A* took ...."
    */
    InitialHit: function(grid, algorithm) {

        const start = grid[startIndex],
            up = grid[startIndex - number],
            down = grid[startIndex + number],
            left = grid[startIndex - 1],
            right = grid[startIndex + 1];

        // We add the surrounding points to an array just so we can check the user didn't put the end square directly around the start point
        const directions = [up, down, left, right];

        // Check that the end isn't immeadiatly around the point
        for (let i = 0; i < directions.length; i++) {
            if (directions[i]) { // Becuase we added all of them to the directions array, an element (if were on the top or bottom row) may be undefined, and throw errors when we try to examine the id property.
                if (directions[i].id === endIndex) {
                    Algorithm.Success(timeStart, info, algorithm);
                    return;
                }
            }
        }

        // Check the cell exists, and it isn't an obstacle.
        if (up && !up.classList.contains("obstacle")) {
            up.classList.add("explored");
        }
        if (down && !down.classList.contains("obstacle")) {
            down.classList.add("explored");
        }
        if (left && !left.classList.contains("obstacle") && !start.leftEdge) { // Plus checking left isn't an obstacle, check the left point isn't the edge of the grid (or 1 minus would be on the above row). 
            left.classList.add("explored");
        }
        if (right && !right.classList.contains("obstacle") && !start.rightEdge) { // Plus checking right isn't an obstacle, check the right point isn't the edge of the grid (or 1 minus would be on the above row). 
            right.classList.add("explored");
        }
    },

    /*<Summary> Before we run either of the algorithms, ensure there is a start and end point defined.
     */
    CheckStartAndEndPoint: function(grid) {
        // An array to ensure user has defined a start and end  
        const startAndEnd = [];

        for (let i = 0; i < grid.length; i++) {
            if (grid[i].classList.contains("start")) { // Check start is defined
                startAndEnd.push(true);
                startIndex = i;
            }
            if (grid[i].classList.contains("end")) { /// Check end is defined
                startAndEnd.push(true);
                endIndex = i;
            }
        }

        // We should have a start and end. If not, warn the user and return.
        if (startAndEnd.length !== 2) {
            document.getElementById("information").innerHTML = "To run the algorithm, you must render a grid, then select a start and end point.";
            main.style.pointerEvents = "auto"; // Let them interact with the grid again
            return false;
        }

        return true;
    },

    /*<Summary> Called when our algorithm has been set an impossible grid.
     */
    Impossible: function(info) {
        // Alert the user
        info.innerHTML = "The grid rendered is impossible for the algorithm to reach the end point.";

        // Let the user interact again
        main.style.pointerEvents = "auto";
    },

    /*<Summary> Succinct way to evaluate the node is explorable, as it isn't the start, an obstacle or already explored.
     */
    IsElementExplorable: function(element) { // The only places we can't explore are the start point, the end point and an obstacle.
        return !element.classList.contains("obstacle") && !element.classList.contains("start") && !element.classList.contains("explored");
    },

    /*<Summary> This recurses until the end point has been hit in the A*, or until there is no more of the grid left unexplored.
    <grid>         The entire collection of cells
    <timeStart>    The entire collection of cells
    <info>         The DOM element of the information box. Stopwatch too.
    */
    RecurseAStar: function(grid, timeStart, info) {

        // These are lets as we will redefine them when we recursively call our method. 
        let unexploredNodes = [], // Array of the points we're going to explore. 
            endTheAlgorithm = false; // Should we finish the algo? Have we hit the end square?

        for (let i = 0; i < grid.length; i++) {
            // The current node where we will explore one up, down, left, right
            let current = grid[i],
                up = grid[i - number],
                down = grid[i + number],
                left = grid[i - 1],
                right = grid[i + 1];

            if (current.classList.contains("explored")) {
                if (current.leftEdge) { // The left edge property is added to all elements on the far left edge. So we can't explore futher left, or we go to the furthest right point of the row above.

                    // We're on the left edge, we can't evaluate left. 
                    if (up && Algorithm.IsElementExplorable(up) && Algorithm.NoDuplicates(up, unexploredNodes)) {
                        unexploredNodes.push(up);
                    }
                    if (down && Algorithm.IsElementExplorable(down) && Algorithm.NoDuplicates(down, unexploredNodes)) {
                        unexploredNodes.push(down);
                    }
                    if (right && Algorithm.IsElementExplorable(right) && Algorithm.NoDuplicates(right, unexploredNodes)) {
                        unexploredNodes.push(right);
                    }
                } else if (current.rightEdge) { // The right edge property is added to all elements on the far right edge. So we can't explore futher right, or we go to the furthest left point of the row below.

                    // We're on the right edge, we can't evaluate the right cell. 
                    if (up && Algorithm.IsElementExplorable(up) && Algorithm.NoDuplicates(up, unexploredNodes)) {
                        unexploredNodes.push(up);
                    }
                    if (down && Algorithm.IsElementExplorable(down) && Algorithm.NoDuplicates(down, unexploredNodes)) {
                        unexploredNodes.push(down);
                    }
                    if (left && Algorithm.IsElementExplorable(left) && Algorithm.NoDuplicates(left, unexploredNodes)) {
                        unexploredNodes.push(left);
                    }

                } else {
                    // We're not on any edge (except top or bottom), and we'll just check if it's falsy before pushing.
                    // We can't do this on left or right, as the points wouldn't be falsy. They would just be on the wrong row!

                    if (right && Algorithm.IsElementExplorable(right) && Algorithm.NoDuplicates(right, unexploredNodes)) {
                        unexploredNodes.push(right);
                    }
                    if (left && Algorithm.IsElementExplorable(left) && Algorithm.NoDuplicates(left, unexploredNodes)) {
                        unexploredNodes.push(left);
                    }

                    // Is there a row above you? 
                    if (up && Algorithm.IsElementExplorable(up) && Algorithm.NoDuplicates(up, unexploredNodes)) {
                        unexploredNodes.push(up);
                    }
                    // Is there a row below you? 
                    if (down && Algorithm.IsElementExplorable(down) && Algorithm.NoDuplicates(down, unexploredNodes)) {
                        unexploredNodes.push(down);
                    }
                }
            }
        }

        // Check that there is still grid to explore! If we've recursed a few times and there's an impossible game, return.
        if (unexploredNodes.length === 0) {
            Algorithm.Impossible(info);
            return;
        }

        // Categorise the lowest 4 points based on their heuristic score, to the front
        unexploredNodes.sort(function(a, b) {
            if (Number(a.heuristic) < Number(b.heuristic)) {
                return -1
            }
            if (Number(a.heuristic) > Number(b.heuristic)) {
                return 1;
            }
            return 0;
        });

        // We remove any other node other than the 4 lowest heuristic score
        unexploredNodes = unexploredNodes.slice(0, 4);

        // We check it isn't the end cell. The end cell has a -1 heuristic, so it will be at the front. Else, keep exploring.
        for (let i = 0; i < unexploredNodes.length; i++) {
            if (unexploredNodes[i].id === endIndex.toString()) {
                endTheAlgorithm = true;
            } else {
                unexploredNodes[i].classList.add("explored");
                unexploredNodes[i].heuristic = Infinity;
            }
        }

        // Have we hit the end point yet? No? Continue to recurse. 
        if (!endTheAlgorithm) { // These 3 last parameters are to be passed to my Recurse method
            setTimeout(Algorithm.RecurseAStar, 125, grid, timeStart, info)
        } else {
            Algorithm.Success(timeStart, info, "A*");
        }
    },

    /*<Summary> It's pointless to add an element to the array that's already been added
     */
    NoDuplicates: function(element, arr) {
        if (!element) {
            return false;
        }
        for (let i = 0; i < arr.length; i++) {
            if (element.id === arr[i].id) {
                return false;
            }
        }
        return true;
    },

    /*<Summary> This was used for when the user ran an algorithm once (say Djikstra), then pressed A* without clearing the grid, or changing beginning or end square to see how the different algorithm did the same path 
    <grid> The entire grid rendered
    */
    ClearGridOfSearchTiles : function (grid){
        // Don't remove anything, except searched tiles! Obstacles, start and end all stay!
        for(let i=0; i < grid.length; i++){
            if(grid[i].classList.contains("explored")){
                grid[i].classList.remove("explored");
            }
        }
    }
}
    