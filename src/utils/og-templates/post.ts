import satori from "satori";
import { type CollectionEntry } from "astro:content";
import { SITE } from "@/config";
import loadGoogleFonts from "../loadGoogleFont";

export default async (post: CollectionEntry<"blog">): Promise<string> => {
  const allText =
    post.data.title +
    post.data.author +
    SITE.title +
    new URL(SITE.website).hostname +
    "$ cat ~/blog/post █chris-yuan@blog:~by>";

  return satori(
    {
      type: "div",
      props: {
        style: {
          background: "#1a1a1d",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "40px",
        },
        children: {
          type: "div",
          props: {
            style: {
              display: "flex",
              flexDirection: "column",
              width: "100%",
              height: "100%",
              border: "1px solid #3c3c41",
              borderRadius: "8px",
              overflow: "hidden",
            },
            children: [
              // Title bar
              {
                type: "div",
                props: {
                  style: {
                    display: "flex",
                    alignItems: "center",
                    padding: "14px 20px",
                    background: "#2d2d32",
                    gap: "8px",
                  },
                  children: [
                    {
                      type: "div",
                      props: {
                        style: {
                          width: "14px",
                          height: "14px",
                          borderRadius: "50%",
                          background: "#ff5f56",
                        },
                      },
                    },
                    {
                      type: "div",
                      props: {
                        style: {
                          width: "14px",
                          height: "14px",
                          borderRadius: "50%",
                          background: "#ffbd2e",
                        },
                      },
                    },
                    {
                      type: "div",
                      props: {
                        style: {
                          width: "14px",
                          height: "14px",
                          borderRadius: "50%",
                          background: "#27c93f",
                        },
                      },
                    },
                    {
                      type: "span",
                      props: {
                        style: {
                          color: "#808080",
                          fontSize: 14,
                          marginLeft: "8px",
                        },
                        children: "chris-yuan@blog:~",
                      },
                    },
                  ],
                },
              },
              // Terminal content
              {
                type: "div",
                props: {
                  style: {
                    display: "flex",
                    flexDirection: "column",
                    padding: "36px 44px",
                    flex: 1,
                    justifyContent: "space-between",
                  },
                  children: [
                    {
                      type: "div",
                      props: {
                        style: {
                          display: "flex",
                          flexDirection: "column",
                        },
                        children: [
                          // Prompt: $ cat post.title
                          {
                            type: "div",
                            props: {
                              style: {
                                display: "flex",
                                fontSize: 22,
                                marginBottom: "20px",
                              },
                              children: [
                                {
                                  type: "span",
                                  props: {
                                    style: { color: "#27c93f" },
                                    children: "$ ",
                                  },
                                },
                                {
                                  type: "span",
                                  props: {
                                    style: { color: "#808080" },
                                    children: "cat ~/blog/post",
                                  },
                                },
                              ],
                            },
                          },
                          // Post title
                          {
                            type: "div",
                            props: {
                              style: {
                                fontSize: 52,
                                fontWeight: "bold",
                                color: "#c9cacc",
                                lineHeight: 1.3,
                                maxHeight: "280px",
                                overflow: "hidden",
                              },
                              children: post.data.title,
                            },
                          },
                        ],
                      },
                    },
                    // Bottom: author + site title
                    {
                      type: "div",
                      props: {
                        style: {
                          display: "flex",
                          justifyContent: "space-between",
                          width: "100%",
                          fontSize: 20,
                        },
                        children: [
                          {
                            type: "span",
                            props: {
                              style: { color: "#808080" },
                              children: [
                                "by ",
                                {
                                  type: "span",
                                  props: {
                                    style: {
                                      color: "#05ce91",
                                      fontWeight: "bold",
                                    },
                                    children: post.data.author,
                                  },
                                },
                              ],
                            },
                          },
                          {
                            type: "span",
                            props: {
                              style: {
                                color: "#808080",
                              },
                              children: [
                                {
                                  type: "span",
                                  props: {
                                    style: { color: "#27c93f" },
                                    children: "> ",
                                  },
                                },
                                new URL(SITE.website).hostname,
                                {
                                  type: "span",
                                  props: {
                                    style: {
                                      color: "#c9cacc",
                                      marginLeft: "2px",
                                    },
                                    children: "█",
                                  },
                                },
                              ],
                            },
                          },
                        ],
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
      },
    },
    {
      width: 1200,
      height: 630,
      embedFont: true,
      fonts: await loadGoogleFonts(allText),
    }
  );
};
