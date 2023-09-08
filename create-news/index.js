
const inquirer = require('inquirer');
const { News, close } = require('./models/news');


inquirer.registerPrompt('datepicker', require('inquirer-datepicker'));

const questions = [
  {
    type: 'input',
    name: 'title_en',
    message: "Introduce message title",
  },
  {
    type: 'input',
    name: 'message_en',
    message: "Introduce message content"
  },
  {
    type: 'datepicker',
    name: 'date',
    message: "Select date for news",
  },
  {
    type: 'number',
    name: 'iconId',
    message: "Introduce icon id",
  },
  {
    type: 'confirm',
    name: 'isActive',
    message: "Is this new active?",
  },
];

inquirer
  .prompt(questions)
  .then((answers) => {
    console.log(JSON.stringify(answers, null, '  '))
    return News.create({
      message_en: answers.message_en,
      date: answers.date,
      iconId: answers.iconId,
      isActive: answers.isActive,
      title_en: answers.title_en
    })
  })
  .then(close)
  .catch((error) => {
    console.log('Error', error)
  });

