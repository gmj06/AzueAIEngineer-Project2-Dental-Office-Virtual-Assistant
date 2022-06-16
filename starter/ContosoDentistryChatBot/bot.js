// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

const { ActivityHandler, MessageFactory } = require('botbuilder');

const { QnAMaker } = require('botbuilder-ai');
const DentistScheduler = require('./dentistscheduler');
const IntentRecognizer = require('./intentrecognizer');


class DentaBot extends ActivityHandler {
    constructor(configuration, qnaOptions) {
        // call the parent constructor
        super();
        if (!configuration) throw new Error('[QnaMakerBot]: Missing parameter. configuration is required');

        // create a QnAMaker connector
        this.qnAMaker = new QnAMaker(configuration.QnAConfiguration, qnaOptions);
       
        // create a DentistScheduler connector
      
        // create a IntentRecognizer connector
        this.IntentRecognizer =  new IntentRecognizer(configuration.LuisConfiguration);


        this.onMessage(async (context, next) => {
            // send user input to QnA Maker and collect the response in a variable
            // don't forget to use the 'await' keyword
            // If an answer was received from QnA Maker, send the answer back to the user.
           
            const qnaResults = await this.qnAMaker.getAnswers(context);
            // send user input to IntentRecognizer and collect the response in a variable
            // don't forget 'await'
          
            const LuisResult =  await this.IntentRecognizer.executeLuisQuery(context);    
            
            const dentistryTiming = "Dentistry is open Monday - Friday from 9am - 5pm \n Saturday from  11am - 3pm \n Sunday holiday.";
            // determine which service to respond with based on the results from LUIS //
            var date = ""; 
            var time = "";
            if(LuisResult.entities.$instance &&
               LuisResult.entities.$instance.date && 
               LuisResult.entities.$instance.date[0]){
               date =  LuisResult.entities.$instance.date[0].text;
            }

            if(LuisResult.entities.$instance &&
                LuisResult.entities.$instance.time && 
                LuisResult.entities.$instance.time[0]){
                time =  LuisResult.entities.$instance.time[0].text;
            }

          
            if(LuisResult.luisResult.prediction.topIntent === "getAvailability" && 
               LuisResult.intents.getAvailability.score > .5 && 
               LuisResult.entities.$instance && 
               ((LuisResult.entities.$instance.date && LuisResult.entities.$instance.date[0]) || 
                (LuisResult.entities.$instance.time && LuisResult.entities.$instance.time[0]))
            ){
                console.log(`getAvailability : date - ${date}; time - ${time};`);
                //call api with date and  time entity info
                var getAvailability = "I found an availability " + (date != "" ? "for " + date: "") + (time != "" ? "at " + time : "");
                if(LuisResult.text.indexOf("sunday") > 0 || LuisResult.text.indexOf("weekend") > 0 ) {getAvailability = dentistryTiming};
             
                console.log(getAvailability)
                await context.sendActivity(getAvailability);
                await next();
                return;
             }
            
            if(LuisResult.luisResult.prediction.topIntent === "scheduleAppointment" && 
                    LuisResult.intents.scheduleAppointment.score > .5 &&
                    LuisResult.entities.$instance &&
                    ((LuisResult.entities.$instance.date && LuisResult.entities.$instance.date[0]) || 
                      (LuisResult.entities.$instance.time && LuisResult.entities.$instance.time[0]))
            ){
                console.log(`scheduleAppointment : date - ${date}; time - ${time};`);
                //call api with date and  time entity info
                const getScheduleAppointment = "Your appointment is scheduled " + (date != "" ? "for " + date: "") + (time != "" ? " at " + time : "");
                if(LuisResult.text.indexOf("sunday") > 0 || LuisResult.text.indexOf("weekend") > 0 ) {getScheduleAppointment = dentistryTiming};
             
                console.log(getScheduleAppointment)
                await context.sendActivity(getScheduleAppointment);
                await next();
                return;
            }

            if( LuisResult.text.indexOf("what appointments are available") > 0 || LuisResult.text.indexOf("when is the dentistry open?") > 0){
                await context.sendActivity(dentistryTiming);
              
            
            }
            if(LuisResult.text.indexOf("schedule an appointment") > 0 ){
                await context.sendActivity('When do you want to schedule an appointment and at what time ');
           
            }
            
           
            // If an answer was received from QnA Maker, send the answer back to the user
            if(qnaResults[0]){
                // if(qnaResults[0].text && qnaResults[0].text.indexOf("what appointments are available") < 0 &&
                //     qnaResults[0].text.indexOf("when is the dentistry open?") < 0 &&
                //     qnaResults[0].text.indexOf("schedule an appointment") < 0){
                    await context.sendActivity(`${qnaResults[0].answer}`);
            //    }
            }else{
                // If no answers were returned from QnA Maker, reply with help
                await context.sendActivity(`I'm not sure about the answer to your question `
                + 'I can help you in scheduling a dental appointment '
                + 'or you can ask me questions about appointment availability');
            }
             
            await next();
        
        });

        this.onMembersAdded(async (context, next) => {
        const membersAdded = context.activity.membersAdded;
        //write a custom greeting
        const welcomeText = 'Welcome to Dental Office Virtual Assistant. I can help you to schedule your dental appointment '
                            + 'or help you to find the next available appointment times.  '
                            + 'You can say "schedule an appointment today at 3pm" '
                            + 'or "are you open on weekend?"';

        for (let cnt = 0; cnt < membersAdded.length; ++cnt) {
            if (membersAdded[cnt].id !== context.activity.recipient.id) {
                await context.sendActivity(MessageFactory.text(welcomeText, welcomeText));
            }
        }
        // by calling next() you ensure that the next BotHandler is run.
        await next();
    });
    }
}

module.exports.DentaBot = DentaBot;
