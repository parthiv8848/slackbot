const { App, HomeTab } = require("@slack/bolt");
const mysql = require("mysql");
const configuratoin = require("./configuration.json");
const express = require("express");
const app2 = express();
app2.use(express.json());



const app = new App({
  token: configuratoin.SLACK_BOT_TOKEN,
  signingSecret: configuratoin.SLACK_SIGNING_SECRET,
  socketMode: true,
  appToken: configuratoin.SLACK_APP_TOKEN,
  icon_emoji: ":custom_emoji:",
});

const connection = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "fullstack",
});

connection.connect((err) => {
  if (err) {
    console.error("Error connecting to database:", err);
    return;
  }
  console.log("Connected to database");
});

app.command("/hello", async ({ command, ack, say }) => {
  await ack();

  await say(`Hello, <@${command.user_id}>`);
});

app.command("/say_name", async ({ command, ack, say }) => {
  await ack();

  const name = command.text;

  await say(`Your name is ${name}`);
});

app.command("/add_numbers", async ({ command, ack, say }) => {
  await ack();

  const numbers = command.text.split(" ");

  const sum = numbers.reduce((a, b) => parseInt(a) + parseInt(b), 0);

  await say(`The sum is ${sum}`);
});

app.command("/random_quote", async ({ command, ack, say }) => {
  await ack();

  const quotes = await fetch("https://type.fit/api/quotes");
  const response = await quotes.json();

  const randomIndex = Math.floor(Math.random() * response.length);

  const randomQuote = response[randomIndex];

  const randomQuoteAuthor = randomQuote.author.replace(/, type\.fit/g, "");

  await say(`"${randomQuote.text}" - ${randomQuoteAuthor}`);
});

// Action handler for button click
app.action("click_me_button", async ({ ack, body, context, client }) => {
  // Acknowledge the button click
  await ack();

  try {
    // Call the API to fetch items
    const response = await fetch("http://localhost:3000/api/items");
    const items = await response.json();

    // Create blocks for displaying the data

    const blocks = [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "*Items List*",
        },
      },
      // Iterate through database results and add blocks as needed
      ...items.map((item) => ({
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Name:* ${item.name}\n*Value:* ${item.value}`,
        },
      })),
    ];

    // Send the Slack message with blocks
    await client.chat.postMessage({
      channel: body.user.id,
      blocks,
    });
  } catch (error) {
    console.error("Error fetching items:", error);
    // Handle error response
    await client.chat.postMessage({
      channel: body.user.id,
      text: "Error fetching items. Please try again later.",
    });
  }
});

app2.post("slack/events", (req, res) => {
  const { challenge } = req.body;

  if (challenge) {
    // Respond to the Slack Events API challenge
    res.status(200).json({ challenge });
  } else {
    // Handle other Slack events
    // You can add your event handling logic here
    res.status(200).send();
  }
});




app2.get("/api/items", (req, res) => {
  const query = "SELECT * FROM items";

  connection.query(query, (err, results) => {
    if (err) {
      console.error("Error executing the query:", err);
      res.status(500).json({ error: "Internal Server Error" });
      return;
    }

    res.json(results);
  });
});


app.event("app_home_opened", async ({ event, context, client }) => {
  console.log(
    "⚡️Hello! Someone just opened the app to DM so we will send them a message!"
  );

  try {
    // Send a message to the user when the app home is opened
    await client.chat.postMessage({
      channel: event.user,
      text: "Hello world!",
    });

    // Update the Home tab view with personalized content
    await client.views.publish({
      user_id: event.user,
      view: {
        type: "home",
        callback_id: "home_view",
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: "*Welcome to your _App's Home_* :tada:",
            },
          },
          {
            type: "divider",
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: "This button won't do much for now, but you can set up a listener for it using the `actions()` method and passing its unique `action_id`. See an example in the `examples` folder within your Bolt app.",
            },
          },
          {
            type: "actions",
            elements: [
              {
                type: "button",
                text: {
                  type: "plain_text",
                  text: "Click me!",
                },
                action_id: "click_me_button", // Unique action ID for the button
              },
              {
                type: "button",
                text: {
                  type: "plain_text",
                  text: "Leave Request",
                },
                action_id: "leave_request_button", // Unique action ID for the button
              },
            ],
          },
        ],
      },
    });
  } catch (error) {
    console.error(error);
  }
});




app.action("leave_request_button", async ({ ack, body, context, client }) => {
  // Acknowledge the button click
  await ack();

  try {
    // Open a modal for the leave request
    await client.views.open({
      trigger_id: body.trigger_id,
      view: {
        type: "modal",
        callback_id: "leave_request_modal",
        title: {
          type: "plain_text",
          text: "Leave Request",
        },
        blocks: [
          {
            type: "section",
            block_id: "leave_request_block",
            text: {
              type: "mrkdwn",
              text: "Please fill out the leave request form:",
            },
          },
          {
            type: "input",
            block_id: "leave_type_block",
            label: {
              type: "plain_text",
              text: "Leave Type",
            },
            element: {
              type: "static_select",
              action_id: "leave_type_select",
              placeholder: {
                type: "plain_text",
                text: "Select leave type",
              },
              options: [
                {
                  text: {
                    type: "plain_text",
                    text: "Vacation",
                  },
                  value: "vacation",
                },
                {
                  text: {
                    type: "plain_text",
                    text: "Sick Leave",
                  },
                  value: "sick_leave",
                },
                // Add more leave types as needed
              ],
            },
            dispatch_action: true, // Add this line
          },
          // ... (other input blocks with dispatch_action set)
          {
            type: "actions",
            elements: [
              {
                type: "button",
                text: {
                  type: "plain_text",
                  text: "Submit",
                },
                action_id: "submit_leave_request",
              },
            ],
          },
        ],
      },
    });
  } catch (error) {
    console.error(error);
  }
});

// Action handler for Submit button in Leave Request modal
// Listen for the submit_leave_request action ID
app.action("submit_leave_request", async ({ ack, body, context, client }) => {
  // Acknowledge the button click
  await ack();

  try {
    // Extract information from the view submission
    const { user, view } = body;
    const { values } = view.state;

    // Get data from form inputs
    const leaveType =
      values.leave_type_block.leave_type_select.selected_option.value;

    // Insert data into the database
    const query =
      "INSERT INTO leave_requests (user_id, leave_type) VALUES (?, ?)";
    connection.query(query, [user.id, leaveType], (err, results) => {
      if (err) {
        console.error("Error inserting into database:", err);
        return;
      }

      console.log("Leave request inserted into the database:", results);

      // Close the modal and notify the user
      client.views.update({
        view_id: view.id,
        view: {
          type: "modal",
          callback_id: "leave_request_modal",
          notify_on_close: true,
          private_metadata: JSON.stringify({}),
          title: {
            type: "plain_text",
            text: "Leave Request Form",
          },
          blocks: [
            {
              type: "section",
              block_id: "leave_request_block",
              text: {
                type: "mrkdwn",
                text: "Your leave request has been submitted!",
              },
            },
          ],
        },
      });
    });
  } catch (error) {
    console.error(error);
  }
});



(async () => {
  // Start your app
  await app.start(process.env.PORT || 3000);
  console.log(`⚡️ Bot app is running on port ${process.env.PORT || 3000}!`);
})();

const PORT = 3000;
app2.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
