const fs = require('fs');
const file = 'components/pos/reports.tsx';
let data = fs.readFileSync(file, 'utf8');

data = data.replace(
  "const scheduleObj = item.game.schedules?.find(s => s.id === item.schedule || s.name === item.schedule)",
  "const scheduleObj = item.game.schedules?.find(s => s.id === item.schedule || s.name === item.schedule || s.time === item.schedule)"
);

data = data.replace(
  "schedule: scheduleObj ? scheduleObj.id : item.schedule,",
  "schedule: scheduleObj ? scheduleObj.time : item.schedule,"
);

data = data.replace(
  "const scheduleObj = firstItem.game.schedules?.find(s => s.id === firstItem.schedule || s.name === firstItem.schedule)",
  "const scheduleObj = firstItem.game.schedules?.find(s => s.id === firstItem.schedule || s.name === firstItem.schedule || s.time === firstItem.schedule)"
);

fs.writeFileSync(file, data);
