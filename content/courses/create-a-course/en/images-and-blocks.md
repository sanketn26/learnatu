---
title: Images, info blocks and collapsible blocks
summary: Pictures with captions, text that wraps around them, and boxes that stand out or fold away
minutes: 9
objectives:
  - Add an image with a caption and a description
  - Place an image beside the text, or side by side with others
  - Write info blocks and collapsible blocks
  - Know what the upload check requires
---

Three things make a lesson easier to read than a wall of text: pictures, boxes that pull attention to what matters,
and parts the reader can open when they want more. All three are written in plain Markdown, with no HTML.

## Images

````markdown
![A learner checking a bank message on a phone](../images/phone.png "Figure 1. Check the sender before you act")
````

- The text in square brackets is the **alt text**: a description for readers who cannot see the picture, and for
  when it fails to load. **It is required.** The upload check refuses an image without it.
- The text in quotes at the end becomes a visible **caption**. It is optional.
- Put the image on a line of its own.
- In a zip, keep pictures in the `images/` folder and point to them like `../images/phone.png`.
- Pictures load as the reader scrolls, never overflow the page, and keep their proportions.

A good alt text says what the picture shows or what it is for: "A bank SMS with a link to a fake website", not
"image1".

Here is one, with a caption:

![A woman and an older man looking at a scam warning on a phone](/images/illustrations/stay-safe.webp "Figure 1. A caption sits under the picture")

## Place an image beside the text

For more control, use the `::figure` line. It takes the image address, the alt text, where it goes and how wide it is.

````markdown
::figure[A caption]{src="../images/phone.png" alt="A phone showing a scam warning" align=right width=40%}

The paragraphs that follow flow around the picture on the left.
````

| Setting | Values |
| --- | --- |
| `src` | The image address. Required. |
| `alt` | The description. Required. |
| `align` | `left`, `right` (text wraps around it), `center`, or `full` (the whole width) |
| `width` | A percentage such as `40%` (10 to 100) or a size such as `320px`. Default 40% for left and right. |

::figure[Pictures can sit beside the text]{src="/images/illustrations/use-ai.webp" alt="Three people using a phone to ask an AI for help" align=right width=42%}

The picture on the right is placed with `align=right`. The words you are reading now flow around it, as they would
in a magazine. This is good for a picture that supports a paragraph, rather than one the whole lesson depends on.

On a wide screen the text wraps. On a phone there is no room to wrap, so the picture moves above the text at full
width. You do not need to do anything for that. It also means you should never write "the picture on the right"
without saying what it shows.

A heading always starts below a floated picture, so a picture never crashes into the next section.

## Pictures side by side

Wrap two or three images in `:::gallery`. They share a row on a wide screen and stack on a phone.

````markdown
:::gallery
![The safe screen](../images/safe.png "Safe")
![The fake screen](../images/fake.png "Fake")
:::
````

:::gallery
![A woman and an older man looking at a phone](/images/illustrations/stay-safe.webp "Staying safe")
![Three people using a phone](/images/illustrations/use-ai.webp "Using AI")
:::

## Info blocks

Fence a box with three colons and a type. Put a title in square brackets, or leave it out to use the type's name.

````markdown
:::tip[Keep it short]
One idea per lesson. **Markdown** works inside the box, including lists and links.
:::
````

:::note[Note]
A neutral aside. Use it for background that is good to know.
:::

:::info[Info]
Extra context that is not part of the main steps.
:::

:::tip[Tip]
A shortcut or a habit that saves time.
:::

:::success[Success]
What done looks like, or good news.
:::

:::warning[Warning]
Something that goes wrong if it is skipped.
:::

:::danger[Danger]
Something that costs money, data or safety. Keep it for the serious cases.
:::

Each type has its own colour, icon and spoken label, so the meaning does not depend on colour alone. Don't use a
box on every paragraph, or none of them will stand out.

!!! warning "The older callout still works"
    Lessons written with the earlier `!!! warning "Title"` line keep working. New lessons should use the boxes above.

## Collapsible blocks

A `details` block shows only its title until the reader opens it. It is good for hints, worked answers, long examples
and "go deeper" asides.

````markdown
:::details[Show the worked answer]
The total is 480, because 4 × 120 = 480.
:::
````

:::details[Try it: open this block]
It opens and closes with a click or the keyboard, and works with screen readers. Anything you can put in a lesson can go inside, including a list:

- an image
- a formula
- a short code sample
:::

:::details[This one starts open]{open}
Add `{open}` after the title when most readers should see the content straight away.
:::

!!! warning "Do not hide what everyone needs"
    A reader who skips a collapsed block misses it. Keep the main steps in the open text.

## What the upload check looks for

- an image with no alt text
- an image that points to a file that is not in the zip
- a `::figure` with no `src` or no `alt`, or with an `align` or `width` that is not allowed
- an unknown block name, such as `:::sparkle`

Each problem names the lesson file and the line. A colon in ordinary text, as in "10:30" or "Note: this", is just
text.

```quiz
type: single
question: What is required on every image?
options:
  - A caption
  - Alt text, a description of the picture
  - A width
answer: 2
explain: A caption and a width are optional. Alt text is required, for readers who cannot see the picture.
```

```quiz
type: multiple
question: Which of these can go inside an info block?
options:
  - Bold text and lists
  - A link
  - An image
  - A quiz
answer: [1, 2, 3]
explain: Markdown works inside a block. Keep quizzes in the main text so they are easy to find.
```
