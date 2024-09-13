addEventListener('message', (event: MessageEvent<File>) => {
    const file = event.data;
    const reader = new FileReader();

    reader.onloadend = () => {
        const dataUrl = reader.result;
        self.postMessage(dataUrl);
    };

    reader.readAsDataURL(file);
});