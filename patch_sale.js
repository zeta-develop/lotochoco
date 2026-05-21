const fs = require('fs');
const file = 'components/pos/pos-sale.tsx';
let data = fs.readFileSync(file, 'utf8');

data = data.replace(
  "selectedSchedule,",
  "selectedSchedule,\n    updateAllCartItems,"
);

const oldOnChange = `onChange={(event) => {
                      const schedule = selectedGame?.schedules?.find((item) => item.id === event.target.value)
                      setSelectedSchedule(schedule || null)
                    }}`;

const newOnChange = `onChange={(event) => {
                      const schedule = selectedGame?.schedules?.find((item) => item.id === event.target.value)
                      setSelectedSchedule(schedule || null)
                      if (schedule) {
                        updateAllCartItems({ schedule: schedule.time, scheduleName: schedule.name })
                      }
                    }}`;

data = data.replace(oldOnChange, newOnChange);

fs.writeFileSync(file, data);
