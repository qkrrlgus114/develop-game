const eventLog = [];

export function track(eventName, payload = {}) {
  const entry = {
    eventName,
    payload,
    timestamp: new Date().toISOString(),
  };

  eventLog.push(entry);
  console.info('[error-popup-hell]', eventName, payload);
  return entry;
}

export function getEventLog() {
  return [...eventLog];
}
