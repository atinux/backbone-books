/*
** Backbone-books by Sebastien Chopin
** @Atinux
** http://www.atinux.fr
*/

(function () {

// Please use your Google API key, be cool :) (http://code.google.com/apis/books/docs/v1/getting_started.html)
var Book, Books, BookView, LibraryView, apiKey = 'AIzaSyAUpierWu7ydjKsa2141jS55CCnqu7JXZo';

// Model
Book = Backbone.Model.extend(),

// Book View
BookView = Backbone.View.extend({
	tagName: 'div',
	initialize: function () {
		var that = this;
		this.model.attributes.volumeInfo = this.model.attributes.volumeInfo || {};
		this.model.attributes.volumeInfo.imageLinks = this.model.attributes.volumeInfo.imageLinks || {};
		setTimeout(function () {
			that.render();
		}, this.options.time);
	},
	events: {
		'click': 'showBookDetail'
	},
	render: function () {
		if (this.options.parent.lastSearch === this.options.lastSearch) {
			var template = $('#bookTemplate').html();
			this.$el.html(_.template(template, { model: this.model }));
			this.$el.hide().appendTo('.books').fadeIn(200);
		}
	},
	showBookDetail: function () {
		var parent = this.options.parent,
			scrollTop = parent.$('.library').scrollTop(),
			bookDetail = parent.$('.bookDetail'),
			that = this;
		parent.showBookDetail = true;
		parent.bookDetailTop = scrollTop;
		bookDetail.css({
			'top': scrollTop,
			'bottom': -scrollTop
		})
		.html(_.template($('#bookDetailTemplate').html(), { hash: this.model.toJSON() }))
		.fadeIn();
		// Call the self link to check if a better resolution of the image is available
		if (!this.model.attributes.volumeInfo.imageLinks.small) {
			$.ajax({
				url: 'https://www.googleapis.com/books/v1/volumes/'+this.model.id,
				dataType: 'jsonp',
				data: 'fields=volumeInfo/imageLinks&key='+apiKey,
				success: function (res) {
					if (res.volumeInfo && res.volumeInfo.imageLinks && res.volumeInfo.imageLinks.small) {
						that.model.attributes.volumeInfo.imageLinks.small = res.volumeInfo.imageLinks.small;
					}
					else {
						that.model.attributes.volumeInfo.imageLinks.small = 'bad';
					}
					that.addBiggerImage();
				}
			});
		}
		else {
			this.addBiggerImage();
		}
	},
	addBiggerImage: function () {
		var smallImg = this.model.attributes.volumeInfo.imageLinks.small;
		if (smallImg !== 'bad') {
			this.options.parent.$('.imgBook').append('<img src="'+ smallImg.replace('&edge=curl', '') +'" />');
		}
	}
});

// Library View
LibraryView = Backbone.View.extend({
	initialize: function () {
		// this.books = new Books();
		this.search();
		// Bind scroll event
		_.bindAll(this, 'hideBookDetailScroll');
		this.$('.library').scroll(this.hideBookDetailScroll);
		_.bindAll(this, 'moreBooks');
		this.$('.library').scroll(this.moreBooks);
	},
	events: {
		'change .searchValue': 'search',
		'click .close': 'hideBookDetail'
	},
	search: function (e) {
		this.s = this.$('.searchValue').val(),
		lastSearch = new Date().getTime(),
		that = this;
		that.$('.books').html('');
		this.lastSearch = lastSearch;
		this.$('.spinner').fadeIn();
		this.page = 0;
		if (this.s.trim().length) {
			$.ajax({
				url: 'https://www.googleapis.com/books/v1/volumes',
				dataType: 'jsonp',
				data: 'q='+encodeURIComponent(this.s)+'&maxResults=40&key='+apiKey+'&fields=totalItems,items(id,volumeInfo/title,volumeInfo/subtitle,volumeInfo/authors,volumeInfo/publishedDate,volumeInfo/description,volumeInfo/imageLinks)',
				success: function (res) {
					that.$('.spinner').fadeOut();
					that.nbMaxPage = Math.ceil(res.totalItems / 40);
					if (that.lastSearch === lastSearch) {
						if (res.items && res.items.length) {
							for (var i in res.items) {
								new BookView({
									model: new Book(res.items[i]),
									time: 80 * i,
									lastSearch: lastSearch,
									parent: that
								});
							}
						}
						else if (res.error) {
							that.$('.books').html('<h1 class="notFound">Error, please retry later :s</h1>');
						}
						else {
							that.$('.books').html('<h1 class="notFound">No books found</h1>');
						}
					}
				}
			});
		}
		else {
			that.$('.books').html('<h1 class="notFound">Hummmm, can do better :)</h1>');
			that.$('.spinner').fadeOut();
		}
	},
	hideBookDetailScroll: function () {
		if (this.showBookDetail) {
			var actualTop = this.$('.library').scrollTop(),
				marge = 150;
			if (actualTop > this.bookDetailTop + marge || actualTop < this.bookDetailTop - marge) {
				this.showBookDetail = false;
				this.hideBookDetail();
			}
		}
	},
	hideBookDetail: function () {
		this.$('.bookDetail').fadeOut();
	},
	moreBooks: function () {
		var totalHeight = this.$('.library > div').height(),
			scrollTop = this.$('.library').scrollTop() + this.$('.library').height(),
			lastSearch = this.lastSearch,
			that = this,
			marge = 200;
		if (scrollTop + marge >= totalHeight && !this.loadingMore && this.page < this.nbMaxPage) {
			this.loadingMore = true;
			this.page++;
			this.$('.spinner').fadeIn();
			$.ajax({
				url: 'https://www.googleapis.com/books/v1/volumes',
				dataType: 'jsonp',
				data: 'q='+encodeURIComponent(this.s)+'&startIndex='+(this.page * 40)+'&maxResults=40&key='+apiKey+'&fields=totalItems,items(id,volumeInfo/title,volumeInfo/subtitle,volumeInfo/authors,volumeInfo/publishedDate,volumeInfo/description,volumeInfo/imageLinks)',
				success: function (res) {
					that.$('.spinner').fadeOut();
					that.loadingMore = false;
					if (that.lastSearch === lastSearch && res.items && res.items.length) {
						for (var i in res.items) {
							new BookView({
								model: new Book(res.items[i]),
								time: 80 * i,
								lastSearch: lastSearch,
								parent: that
							});
						}
					}
				}
			});
		}
	}
});

// Run application
$(function () {
	new LibraryView({
		el: $('#content')
	});
});

})();
