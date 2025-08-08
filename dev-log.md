## July 13, 2025

After spending about a month learning HTML and CSS, I finally took the leap and started building the actual UI for the Pet AI Assistant. I began by translating my Figma sketch into code, using the same color palette — mainly modern shades of blue — to maintain a clean and user-friendly feel.

Seeing the first version of the page come to life felt really good. It reminded me that I just needed to start — even if it’s not perfect. The important thing is to build, and trust that the learning will happen along the way.


## July 14, 2025

I showed the initial version of the form to my friend Mehrad, who has two dogs. He suggested a great idea: changing the theme color of the page based on the selected dog breed. I loved it, and decided to implement it right away.

This was a big moment for me because it meant diving into JavaScript — something I hadn’t really touched before. It took a long time to figure it out, but the process taught me a lot, and in the end, I think it was totally worth it.


## July 15, 2025

I was happy with how the form page turned out, so I moved on to the second page: the pet profile and food recommendation screen. I worked on the UI with the same clean, modern feel as the form, and implemented the same breed-based theming for consistency.

I finished the top profile bar and got the layout started, but I was still unsure about how to design and categorize the food recommendation section. Rather than rush it, I decided to leave that part for another day and give it more thought.


## July 16, 2025

I wasn’t sure how I’d handle the backend or where to get the food data from, since I had no prior experience with that side of development. After talking to two of my graduate student friends, Alireza A. and Alireza P., they reassured me that it’s totally doable. They suggested options like using GPT APIs, web crawling, or even collecting and storing data locally with filtering algorithms for the ingredients. They really liked my idea and encouraged me to keep going.

That conversation gave me a major boost of motivation. I went back to work and focused on syncing the two pages using localStorage in JavaScript, so I could test how pet profiles from the form page would update the profile on the recommendation page. With help from another friend, Arian (also a grad student), I was able to get it working. He also liked the concept and gave positive feedback on the design.

Today felt like a big milestone — I learned a lot, got real features working, and received strong support from people I trust.


## July 17, 2025

Today I started the backend phase of the Pet AI Assistant project. The goal was to take the data submitted through the frontend form and store it in a database. I used Java with Spring Boot as the framework and chose MongoDB as my database solution. It was a completely new process for me, but after working through the setup and seeing the data flow correctly from the form to the database, it felt really good and like a big step forward.


## July 18, 2025

Tonight we hosted a family dinner because one of my mom’s cousins was visiting Toronto. Her husband was there too — he has a background in computer science and did his master’s and PhD in a field that combines computer science with biology. I don’t remember the exact specialization, but he’s recently gotten really into entrepreneurship and building apps.

Once we found out we had common interests, I showed him my app and explained the idea behind it. He genuinely liked it and gave me a lot of motivation. He told me this could be something big — a real business — and at the same time, he gave me a serious wake-up call. He said that people move fast now, and if I don’t stick to this and follow through, someone else will build something similar.

That hit hard. I already knew that my laziness was the main reason the app wasn’t functional yet. He made me promise that within the next two weeks, the app should at least be fully functional at a test level. It honestly scared me, but in a good way.

One thing that stuck with me was his advice not to treat this app like just another portfolio project for internships. He told me that mindset would hold me back — that if I believe in it, I need to treat it like a product. That’s also when he told me not to upload the backend code to GitHub, which made total sense after our talk.


## July 20, 2025

Saturdays and Sundays are both long workdays for me, and I usually only get one of them off. Today, after finishing work, I had to head to my aunt’s house for a birthday party — the whole family was there. I had already lost yesterday to a family trip, and now today was slipping away too. But I reminded myself that success doesn’t come from waiting for free time — I have to make time.

So I packed my laptop, went to the party, said hi to everyone, and headed straight to the basement to work. That’s when I came up with the core of my filtering algorithm for food recommendations. It’s based on the user’s goals (like weight loss or muscle gain) and properly categorizes foods accordingly. That felt like a solid breakthrough, especially considering the circumstances.


## July 21, 2025

Mondays are also workdays for me because it’s shipment day at the store. But I knew it could also be a great chance to show my app to someone who really understands the pet business — the owner of the store, Jay. If you didn’t know, I work at PetValu, and that’s actually how the idea for this app originally came to me.

Jay owns three stores and I’ve been working with him for over two years. We know and trust each other, so I felt confident showing him what I’ve built so far. He was really supportive and gave me valuable, practical feedback right away.

The first thing he recommended was to change the age input into a multiple-choice option: puppy, adult, and senior. It’s simpler and more useful for filtering food. He also suggested replacing the breed selector with breed size (small, medium, large). His reasoning was solid — there are too many breeds, and listing them all would overwhelm users. Breed size is more relevant for food filtering and much easier to work with.

So that night, I officially said goodbye to breed-based theming and color changes. It was a tough design choice to let go of, but it made the app smarter and more user-friendly — and that's what matters.


## July 23, 2025

Today was all about the filtering logic — testing and making sure everything worked correctly with the updated user form. It took a lot of time and energy. Things didn’t go smoothly at first; some parts of the logic failed or didn’t respond the way I expected. But by the end of the day, I managed to figure it out. It was one of those frustrating but necessary workdays where you push through and come out with a working system that makes the whole project stronger.