const sum = (array, prop) => array.reduce((a, b) => a + (b[prop] || 0), 0);

const dDay = new Date();
const dWeek = new Date();
const dMonth = new Date();
const dYear = new Date();

// beginning of Day
dDay.setHours(0, 0, 0, 0);

// beginning of Week
const dayOfWeek = dWeek.getDay();
dWeek.setHours(0, 0, 0, 0);
dWeek.setDate(dWeek.getDate() - (dayOfWeek ? dayOfWeek - 1 : -7));

// beginning of Month
dMonth.setHours(0, 0, 0, 0);
dMonth.setDate(1);

// beginning of Year
dYear.setHours(0, 0, 0, 0);
dYear.setDate(1);
dYear.setMonth(0);

module.exports = { sum, dDay, dWeek, dMonth, dYear };
