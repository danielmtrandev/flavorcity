let likeBtn = document.getElementsByClassName('likeBtn');

Array.from(likeBtn).forEach(function (element) {
	element.addEventListener('click', function () {
		const likedPostId = element.dataset.id // targeting what the loop is spitting out on feed.ejs (line 27)
		console.log('likedPostId:', likedPostId)

		fetch('likePost', {
			method: 'put',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				likedPostId: likedPostId, // sending to database, turning it into an object on routes (135)
			}),
		})
			.then(response => {
				if (response.ok) return response.json();
			})
			.then(data => {
				console.log(data);
				window.location.reload();
			});
	});
});