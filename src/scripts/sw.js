self.addEventListener('push', (event) => {
  let data = {
    title: 'New Story',
    options: {
      body: 'You have a new story!',
      icon: '/icon.png', // Optional: Add an icon for the notification
      badge: '/badge.png' // Optional: Add a badge for the notification
    }
  };

  if (event.data) {
    try {
      // Try to parse the data as JSON
      const parsedData = event.data.json();
      data = parsedData;
    } catch (error) {
      console.error('Error parsing push data:', error);
      // Fallback: Use the text data as the body if JSON parsing fails
      try {
        data.options.body = event.data.text() || 'You have a new story!';
      } catch (textError) {
        console.error('Error reading text data:', textError);
      }
    }
  }

  const promiseChain = self.registration.showNotification(data.title, data.options);
  event.waitUntil(promiseChain);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow('/')
  );
});