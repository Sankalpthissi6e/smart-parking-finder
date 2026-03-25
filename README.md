# Smart Parking Finder
A web-based application that helps users find the nearest or most optimal parking slot using graph algorithms such as Breadth First Search (BFS) and Dijkstra’s Algorithm.
---------------------------------------------------------------------------
## Live Demo
https://sankalpthissi6e.github.io/smart-parking-finder/
---------------------------------------------------------------------------
## Features
* Dynamic parking grid generation
* User position selection
* Simulation of occupied parking slots
* VIP parking slots with priority handling
* Nearest slot detection using BFS
* Optimal slot selection using Dijkstra’s Algorithm
* Real-time path visualization
-----------------------------------------------------------------------------
## Tech Stack
* Frontend: HTML, CSS, JavaScript
* Algorithms:
  * Breadth First Search (BFS)
  * Dijkstra’s Algorithm
------------------------------------------------------------------------------
## How It Works
1. The grid represents a parking area:
   * 0 → Free slot
   * 1 → Occupied slot
   * 2 → VIP slot
   * 3 → User position
2. The user selects a starting position.
3. An algorithm is chosen:
   * BFS finds the nearest available slot based on minimum steps
   * Dijkstra finds the most optimal slot considering priority (VIP slots)
4. The application computes and displays the path visually.
--------------------------------------------------------------------------------
## Getting Started
### Run Locally
1. Clone the repository:
```bash
git clone https://github.com/sankalpthissi6/smart-parking-finder.git
```
2. Navigate to the project folder
3. Open index.html in a browser
   or use Live Server in Visual Studio Code
   -------------------------------------------------------------------------------
## Future Improvements
* Mobile responsiveness
* Integration with maps for real-world navigation
* Backend integration with real-time parking data
* Advanced algorithms such as A*
