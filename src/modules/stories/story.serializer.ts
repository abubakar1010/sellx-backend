export const serializeStory = (story: any, opts?: { isViewed?: boolean }) => ({
    id: story.id ?? String(story._id ?? ''),
    purchase: story.purchase ? String(story.purchase._id ?? story.purchase) : null,
    user: story.user
        ? {
              id: story.user.id ?? String(story.user._id ?? ''),
              firstName: story.user.firstName,
              lastName: story.user.lastName,
              avatarUrl: story.user.avatarUrl,
          }
        : null,
    store: story.store
        ? {
              id: story.store.id ?? String(story.store._id ?? ''),
              name: story.store.name,
              logo: story.store.logo,
          }
        : null,
    media: story.media,
    texts: story.texts,
    product: story.product
        ? {
              id: story.product.id ?? String(story.product._id ?? ''),
              title: story.product.title,
              media: story.product.media,
              price: story.product.price,
              currency: story.product.currency,
          }
        : null,
    expireIn: story.expireIn,
    expiresAt: story.expiresAt,
    viewCount: story.viewCount ?? 0,
    isViewed: opts?.isViewed ?? false,
    createdAt: story.createdAt,
    updatedAt: story.updatedAt,
});

export const serializeStories = (
    rows: any[],
    viewerId?: string,
) =>
    rows.map((story) => {
        const hasViewed = viewerId
            ? (story.views ?? []).some(
                  (v: any) => String(v.user) === viewerId,
              )
            : false;
        return serializeStory(story, { isViewed: hasViewed });
    });

export const serializeStoryGroups = (
    groups: Array<{ user: any; store: any; stories: any[] }>,
    viewerId?: string,
) =>
    groups.map((group) => ({
        user: group.user,
        store: group.store,
        stories: group.stories.map((story) => {
            const hasViewed = viewerId
                ? (story.views ?? []).some(
                      (v: any) => String(v.user) === viewerId,
                  )
                : false;
            return serializeStory(story, { isViewed: hasViewed });
        }),
    }));
