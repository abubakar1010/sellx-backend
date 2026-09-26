import { Router } from 'express';
import { Types } from 'mongoose';

import { config } from '@config/index';
import { catchAsync } from '@shared/utils/catchAsync';
import { deepLinkService } from '@shared/utils/deep-link.service';
import { Product } from '@/modules/products/products.model';

const router = Router();

router.get(
    '/product/:id',
    catchAsync(async (req, res) => {
        const id = req.params.id as string;
        const fallbackUrl = config.deepLink.webFallbackUrl || '/';

        if (!id || !Types.ObjectId.isValid(id)) {
            return res.redirect(fallbackUrl);
        }

        const product = await Product.findOne({ _id: id, isDeleted: false })
            .select('title media')
            .lean();

        if (!product) {
            return res.redirect(fallbackUrl);
        }

        const userAgent = req.get('user-agent') || '';
        const platform = deepLinkService.detectPlatform(userAgent);

        if (platform !== 'web') {
            const appDeepLink = deepLinkService.buildProductAppLink(id);
            const storeUrl = deepLinkService.getStoreUrl(platform);

            const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Opening SellX...</title>
  <script>
    window.location.href = "${appDeepLink}";
    setTimeout(function() {
      window.location.href = "${storeUrl}";
    }, 1500);
  </script>
</head>
<body>
  <p>Redirecting to SellX app...</p>
</body>
</html>`;
            return res.type('html').send(html);
        }

        return res.redirect(`${fallbackUrl}/product/${id}`);
    }),
);

export default router;
