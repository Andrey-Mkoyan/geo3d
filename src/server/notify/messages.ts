import 'server-only';

type Msg = { subject: string; body: string };
export type MessageKey = 'orderCreated' | 'quoteReady' | 'paymentApproved' | 'paymentRejected' | 'statusChanged' | 'shippedToCourier';

export const messages: Record<'ka' | 'en' | 'ru', Record<MessageKey, Msg>> = {
  en: {
    orderCreated: {
      subject: 'Geo3D order {order} received',
      body: 'Thank you! Track your order and upload your payment screenshot here: {link}',
    },
    quoteReady: {
      subject: 'Your Geo3D quote for {order} is ready',
      body: 'The final price is {total} GEL. Pay by bank transfer and upload the screenshot here: {link}',
    },
    paymentApproved: {
      subject: 'Payment for {order} confirmed',
      body: 'Your payment was verified and your order is in production. Track it: {link}',
    },
    paymentRejected: {
      subject: 'Payment screenshot for {order} was not accepted',
      body: 'Reason: {reason}. Please upload a new screenshot: {link}',
    },
    statusChanged: {
      subject: 'Order {order}: {status}',
      body: 'Your order status changed to "{status}". Track it: {link}',
    },
    shippedToCourier: {
      subject: 'Order {order} handed to courier',
      body: 'Your order was handed to the courier. Track it: {link}',
    },
  },
  ka: {
    orderCreated: {
      subject: 'Geo3D შეკვეთა {order} მიღებულია',
      body: 'მადლობა! თვალყური ადევნეთ შეკვეთას და ატვირთეთ გადახდის სკრინშოტი: {link}',
    },
    quoteReady: {
      subject: 'თქვენი შეკვეთის {order} ფასი მზადაა',
      body: 'საბოლოო ფასია {total} ლარი. გადაიხადეთ საბანკო გადარიცხვით და ატვირთეთ სკრინშოტი: {link}',
    },
    paymentApproved: {
      subject: 'შეკვეთა {order}: გადახდა დადასტურდა',
      body: 'გადახდა დადასტურდა და შეკვეთა გადადის წარმოებაში. თვალყური ადევნეთ: {link}',
    },
    paymentRejected: {
      subject: 'შეკვეთა {order}: სკრინშოტი არ მიღებულა',
      body: 'მიზეზი: {reason}. გთხოვთ ატვირთოთ ახალი სკრინშოტი: {link}',
    },
    statusChanged: {
      subject: 'შეკვეთა {order}: {status}',
      body: 'თქვენი შეკვეთის სტატუსი შეიცვალა: "{status}". {link}',
    },
    shippedToCourier: {
      subject: 'შეკვეთა {order} გადაცემულია კურიერს',
      body: 'თქვენი შეკვეთა გადაეცა კურიერს. თვალყური ადევნეთ: {link}',
    },
  },
  ru: {
    orderCreated: {
      subject: 'Заказ Geo3D {order} получен',
      body: 'Спасибо! Отслеживайте заказ и загрузите скриншот оплаты: {link}',
    },
    quoteReady: {
      subject: 'Расчёт по заказу {order} готов',
      body: 'Итоговая цена: {total} GEL. Оплатите банковским переводом и загрузите скриншот: {link}',
    },
    paymentApproved: {
      subject: 'Оплата заказа {order} подтверждена',
      body: 'Оплата подтверждена, заказ передан в производство. Отслеживание: {link}',
    },
    paymentRejected: {
      subject: 'Скриншот оплаты {order} не принят',
      body: 'Причина: {reason}. Загрузите новый скриншот: {link}',
    },
    statusChanged: {
      subject: 'Заказ {order}: {status}',
      body: 'Статус заказа изменён: «{status}». {link}',
    },
    shippedToCourier: {
      subject: 'Заказ {order} передан курьеру',
      body: 'Ваш заказ передан курьеру. Отслеживание: {link}',
    },
  },
};
