//Importing a module that hides tokens
import dotenv from "dotenv";
//Importing a module for discord functionality
import {Client, Intents, Message, MessageEmbed} from 'discord.js';
//Importing a module for better get/push requests
import axios from "axios";
//Loading up the token hider
dotenv.config()

//Establishing a discord client
const client = new Client({
    intents: [
        Intents.FLAGS.GUILDS,
        Intents.FLAGS.GUILD_MESSAGES,
        Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
        Intents.FLAGS.DIRECT_MESSAGES,
        Intents.FLAGS.DIRECT_MESSAGE_REACTIONS,
    ],
    partials: ["CHANNEL"],
});

//Logging in as the bot once possible
client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

//When a user sends a message
client.on("messageCreate", async (message) => {
    
    //If the message is 'boom'
    if (message.content.toLowerCase() === "boom") {
        //React to it with the weed emoji
        const reactionEmoji = message.guild.emojis.cache.find(emoji => emoji.name === 'weed');
	    message.react(reactionEmoji);
    }

    //If the message contains '!weather'
    else if (message.content.toLowerCase().startsWith("!weather")) {

        if ((message.content.match(/ /g) || []).length < 2) {
            weatherCommand(message);
        } else {
            weatherTimeCommand(message);
        }

    }
    
    //If the message contains '!anime'
    else if (message.content.toLowerCase().startsWith("!anime")) {
        
        animeCommand(message);

    }

});

async function weatherCommand(message: Message) {

    //Error handler
    try {
        //If the user specified a location
        if (message.content.length > 8) {
                    
            //Joke if statement
            if (message.content.toLowerCase().slice(9) === "fart") {
                message.reply('Haha poopy fart');
            //Actual logic
            } else {
                //Create the url by adding the user specified location to it
                const weatherUrl = "https://api.openweathermap.org/data/2.5/weather?q=" + message.content.slice(9) + "&appid=" + process.env.WEATHER_TOKEN;
                //Gets the weather data and replies to the message
                const data = await fetchWeatherData(weatherUrl);
                message.reply(`The weather in ${message.content.slice(9)} is:\nActual temperature: ${Math.round(data.main.temp - 273.15).toString()}°C\nFeels like: ${Math.round(data.main.feels_like - 273.15).toString()}°C`);
            }
        
        }
        //If the user did not specify a location
        else {
            //Use Halifax's weather as the default
            const weatherUrl = "https://api.openweathermap.org/data/2.5/weather?q=Halifax&appid=" + process.env.WEATHER_TOKEN;
            //Gets the weather data and replies to the message
            const data = await fetchWeatherData(weatherUrl);
            message.reply(`The weather in Halifax is (default location):\nActual temperature: ${Math.round(data.main.temp - 273.15).toString()}°C\nFeels like: ${Math.round(data.main.feels_like - 273.15).toString()}°C`);
        }

    //If an error was thrown
    } catch(err) {
        //Reply to the message claiming the location was not found
        message.reply("Location not found");
    }
    
}

async function weatherTimeCommand(message: Message) {

    //Error handler
    try {
        const userWords = message.content.split(' ');
        //Create the url by adding the user specified location to it
        const weatherUrlCoords = "https://api.openweathermap.org/data/2.5/weather?q=" + userWords[1] + "&appid=" + process.env.WEATHER_TOKEN;
        //Gets the weather data and replies to the message
        const temp = await fetchWeatherData(weatherUrlCoords);
        const weatherUrl = `https://api.openweathermap.org/data/2.5/onecall?lat=${temp.coord.lat}&lon=${temp.coord.lon}&appid=${process.env.WEATHER_TOKEN}`;
        const data = await fetchWeatherData(weatherUrl);
        const d = new Date();
        const hours = Number(userWords[2]) - d.getHours();
        const unixTime = Math.round(d.getTime() / 1000) + (hours * 3600);
        var niceTime = ""

        if (Number(userWords[2]) > 12) {
            niceTime = Number(userWords[2]) - 12 + "pm";
        } else {
            niceTime = userWords[2] + "am";
        }
        
        for (let i = 0; i < data.hourly.length; i ++) {

            if (data.hourly[i].dt >= unixTime) {
                message.reply(`The weather in ${userWords[1]} at ${niceTime} will be:\nActual temperature: ${Math.round(data.hourly[i].temp - 273.15).toString()}°C\nFeels like: ${Math.round(data.hourly[i].feels_like - 273.15).toString()}°C`);
                break;
            }

        }

    //If an error was thrown
    } catch(err) {
        //Reply to the message claiming the location was not found
        message.reply("Location not found");
    }
    
}

async function animeCommand(message: Message) {

    //Error handler
    try{
        //Gets the anime's data
        const data = await graphqlGet(message.content.slice(7));
        //Create an array to store the studios responsible for animation
        const studios = [];
        //Loop through the list of studios
        for (let i = 0; i < data.studios.nodes.length; i ++) {
            //If the studio is classified as an animation studio (could be a producer or other studios)
            if (data.studios.nodes[i].isAnimationStudio) {
                //Add it to the array
                studios.push(data.studios.nodes[i].name);
            }
        }
        //Remove the html characters from the anime's synopsis
        const desc = data.description.toString().replace(/<.+?>/g, "")
        //Creating a discord embed
        const exampleEmbed = new MessageEmbed()
            //Setting the colour of the sidebar to match the image's
            .setColor(data.coverImage.color.toString())
            //Setting the title
            .setTitle(data.title.english.toString())
            //Linking the title to the original web page
            .setURL('https://anilist.co/anime/' + data.id.toString())
            //Setting the description
            .setDescription(desc)
            //Adding various fields to display information
            .addFields(
                { name: 'Rating', value: data.averageScore.toString() + "%", inline: true },
                { name: 'Episodes', value: data.episodes.toString(), inline: true },
                { name: 'Studio(s)', value: studios.join(), inline: true },
                { name: '\u200B', value: '\u200B' },
                { name: 'Genres', value: data.genres.toString(), inline: true },
                { name: 'Aired', value: data.seasonYear.toString(), inline: true },
                { name: 'Source', value: data.source.toString(), inline: true },
            )
            //Setting the cover image (extra large was the biggest option and looked the best)
            .setImage(data.coverImage.extraLarge)
        //Replying to the original message
        message.reply({ embeds: [exampleEmbed] });
    //If an error was thrown
    } catch(err) {
        //Reply to the message claiming the anime was not found
        message.reply("Anime not found");
    }

}


//Function is asynchronous as we must wait for the website to respond (alternative is polling, not very effective)
async function fetchWeatherData(weatherUrl) {
    //Await waits for server response, get requests need time
    const response = await axios.get(weatherUrl);
    return response.data;
}

//Logging in to the discord api with the hidden token
client.login(process.env.DISCORD_TOKEN);

//A bunch of gibberish --> it's just a different style of a MySQL query
//Gets all the media information regarding the user specified title
const query = `
query ($search: String) { # Define which variables will be used in the query
    Media (search: $search, type: ANIME) { # Insert our variables into the query arguments
      title {
          english
      }
      episodes
      genres
      averageScore
      seasonYear
      source
      description
      id
      coverImage {
        extraLarge
        color
      }
      studios {
        nodes {
            name
            isAnimationStudio
        }
      }
    }
  }
`;

//Defining a function that creates the 'search: target' style constant
//I doubt that it's required to do it this way but I couldn't get it to work with a variable input otherwise
function variables(target) {
    const temp = {
        search: target
    };
    return temp
}

//Gets the anime (graphql was the database the website used)
async function graphqlGet(target) {
    //Sends a post request (typically a get request but graphql works differently) with the query information as well as the target anime
    const anime = await axios.post("https://graphql.anilist.co", {
        query: query,
        variables: variables(target),
    });
    return anime.data.data.Media
}