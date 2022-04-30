# Table of Contents
  * [Intro](#intro)
  * [File Structure](#file-structure)
     * [inquirer.js](#inquirer)
     * [scraping.js](#scraping)
     * [index.js](#index)
     * [notify.js](#notify)
     * manage.js
     * start.js
  * [Running the app](#running-the-app)
  * [Scraping techniques used](#scraping-techniques-used)
  * [Limitations](#limitations)

# Intro
This app is created to scrape the BookmyShow app and notify the user whenever a particular show or a movie is available.
There is no frontend for this app, rather the inputs from the user using `inquirer` to get the data form the terminal itself.
The listeners are then added and are constantly run with a paritcular time-period using the `setInterval` function. 
If the listener is satisfied, then we send a notification (email/sms) to the user.

To use this app for ohter website, firstly we should add the case in `inquirer.js` and then add a function corresponding to that in `scraping.js` 
and then add the listener manager in `index.js` with the matching function and the body, subject of the notification to be given.

# File structure
  The file structure consists of 6 files, inquirer, scaraping& index are specific for the scarping and its functionalities whereas
  notify is used to manage the notication methods and manage, start are the scripts used to run the app
  
  ## inquirer
  This file is about collecting the data form the user about the listener. Firstly, a user can either add/remove/view/start the listeners. 
  ### adding a listener
  Firstly, we need to know the listener the user wants to add. Then,we need to get the parameters of the function. `inquireAdd` can result in two cases, 
  
   1. `inquireAddCity`:
       There are 3 cases for adding a city. 
   2. `inquireAddTheatre`:
        There are 2 cases for adding a theatre.
    
        
  * `inquireTime`: is used to get the time period/ the frequency of the funciton calls.
  *  `inquireEmails`: inquires if user needs email notifications and if so, we inquire for the email ids.
  * `inquireSms`: inquires if user needs sms notifications and if so, we inquire for the mobile numbers.
  * `inquireDate`, `inquireFormat`, `inquireMovieName` : are used as their name suggests.
  
  
  ### removing a listener
   To remove a listener, we firstly get the string form of all the listeners in `data.json` using the `getStringFromListener` function. 
   And then we display all the strings and then allow the user to choose the listner to remove.
  ### view listeners
   Firstly, we get the data of the listeners using the `getFileData` and then arrange the data in a table form and then print the table using `table` npm module.
  ### start listeners
   After you managed the listeners as required, you can start the listeners. But, you this method rather than using `start.js` only when in development.
   
  ## scraping
  This file is the core and is all about the scraping the web page.
  
  I used `puppeteer` as a tool to scrape the web. `launchPuppeteer` is used to launch a browser with a given url and the
  `autoScroll` function scrolls the page to the end so that the page is fully loaded.
  
  ### city
  There are 3 listeners for city.
  #### 1) does movie exist: 
  This listener is used to check if a movie is available in a particualar city. `doesMovieExist` is the used function. 
  This funciton uses the `getMoviesList` which gets the list of the movies from a city and then gives if required movie is present.
  
  #### 2) extra date appears:
  Given a city and a movie name, this listener fires if an extra date is added for the movie. `getDatesFromMovie` is the funciton used. 
  As there can be multiple formats of the movie in the same city, this function also handles that by clicking the first fomat and then uses the 
  `getDatesFromPage` function to get the dates of the movie. This function also uses cache to decrease time, the cache variable is `cachedDatesForMovie`
  
  #### 3) extra show appears:
  Given a city, movie name and the date and the format of the movie, this listener gets the shows in the city. `getAllShowsInCity` is the function used. 
  Firstly, we check if the movie exists in the city. If not, it returns a empty array.
  Then, we check if the given date is valid with the dates from `getDatesFromMovie` function. If no date is given, we get the result for all the dates available.
  Similarly, we check for given format with the formats from `getFormats` funciton. If no format, we get the result for all the formats available. 
  But, giving a date is recommended as if not, the app may not work as expected.
  
  This function uses `getAllShowsInCityFromLink` to get the shows with the given link with given date and format.
  
  ### Theatre
  There are 2 listeners for theatre.
  #### 1) extra date appears:
  Given a theatre url , this listener gets the dates from that page. `getDatesFromPage` is the function used.
  #### 2) extra show appears:
  Given a theatre url and the movie name with its date, this listner gets the shows for that movie. `getShowsFromDateAndMovieAndFormat` is the function used. 
  Firstly, it gets the movies from the theatre date using the `getMoviesFromTheatreDate` function which is similar to `getAllShowsInCity` function. 
  And then checks for the format condition. 
  
  ### checkForCondition
  This is the main function which is responsible for the listener. The `setInterval` is used in this funciton.
  It also checks with the given expression if the condition is met whenever the function is called. If the condition is met, it notifies. 
  
  
  ## index
  This file brings together all the different functionalities. 
  The scraping form `scraping.js` and the inquired data from `inquirer.js` and the notification part aswell.
  
  The database is a json file called `data.json`. We manage the data with `getFileData`, `updateFile`, `writeToFile` functions. 
  And we manage the listeners using `getListener`, `updateListener`, `removeListener` functions.
  
  ### `initializeListeners`: 
  This function is resposible for starting the listeners. This function is called by `start.js` and it calls the `addListeners` for all the listeners.
  
  ### `addListeners`:
  This function adds the listeners and calls the `checkForCondition` and is fed the `notify` function and the options from the json file.
  This function is also responsible for the subject and the body customization for every listener.
  The core functionality of this funciton is comparing the result from the function and checking if the condition is met or not.
  
  We also check while adding a listener if the same listener is already added to avoid duplicate listeners.
  
  ## notify
  This file is used to notify the user. This consists two functions: `notifyViaEmail`, `notifyViaSms`. 
  Both of the functions take the users and the subject+body as the parameters.
  
  `notifyViaEmail`: We send a mail using the `nodemailer` package.
  
  `notifyViaSms`: This is not added yet. 
  
  #### To manage the listeners, we run the  `manage.js` file and to start the listeners, we run the `start.js` file.
  
  # Running the app:
  
  1. To run the app in production, firstly connect to a virtual machine using ssh. 
  In this scenario, the name of ssh is `jarvis` which can be changed in `package.json` scripts
  2. After connecting, we move the `node_modules` folder in the local computer away to another location to store it. 
  3. Then, we can transfer the files using `ssh-transfer` command. After all the required files are transfered, we can bring back the `node_modules` folder.
  4. After the code is in the VM, add/ manage the listeners by running `managing.js` file.
  5. After the listeners are as required, we can run the listeners by running the `start.js`.
  6. After confirming the app is running as required, we can press `ctrl+z` to push the process to background
  7. Then run the `bg %n` / `bg %1` command to re-run the process but in background.
  
  To check the listeners, we can either run `manage.js` and then check the count or  we can run `vi data.json` and see ourselves.
  
  # Scraping techniques used:
   
  I used the funciton `launchPuppeteer` 6 times in the code. 
  
  ### 1. Getting the movies from the page (city):
    Firstly, I extracted all images from the page and then filtered images which are tall with ratio in between [1.4,2].
    Then, I extracted the links from the image, which are returned.
  ### 2. Getting dates from the page (city&theatre):
    I extracted all the `li` elements and then I extracted a class called `date-details`.
    Then, I extracted the first link from the child nodes, which is returned
  ### 3. Getting dates from the movie page (city):
    Firstly, I got the link of the movie using the 1st method. Then we click the first button with class name `booktickets`. 
    
    If redirected, we go back to 2nd method with new link.
    
    else, we get the first different `li` element and then click that button.
    
  ### 4. Getting formats (city):
      I took the element with ID `filterLanguage` then extracted the formats. 
      
  ### 5. Get all shows in city from link (city): 
      Gets the venues from the id `venuelist` and the timings from the `showtime-pill` class name. The name of the venue from `__venue-name` class name.
  ### 6. Getting movies from theatre date link (theatre) : 
      Gets the events list from the id `showEvents` and filter them using the attribute `data-eventcode`. 
      
      Gets the format of the show by class name `eventInfo`, name form `nameSpan` and the timings from the `showtime-pill` class name.
      
 # Limitations
    
    There are also many limitations with this app.
    
    1. Firstly, this is based on web scarping which can be broken when the website is changed and is not according to the code we've written.
    2. As this code runs in a virtual machine, there can be a lot of errors and we cannot be sure if the app is running accordingly. 
        So, this app is constructed to constantly check the VM ourselves and the only advantage is that we can check every couple of hours to be sure. 
    3. For the city, get dates from movie, it does not check all the formats/ specific format. It checks the first format.
    4. Repeated starting of the listeners which results in multiple instances of the same listener. 
    Care should be taken while starting the listeners so that we first stop all the listeners and then start all at once. 

    
    
  